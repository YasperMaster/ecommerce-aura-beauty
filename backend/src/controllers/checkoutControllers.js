import crypto from "crypto";
import { ZodError } from "zod";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import { createCheckoutPreferenceSchema } from "../schemas/checkoutSchema.js";
import {
  getAccessToken,
  getMercadoPagoClients,
  isTestToken,
} from "../config/mercadoPago.js";
import { sendAdminPurchaseEmail } from "../utils/emailNotifications.js";
import { createLogger } from "../utils/logger.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const normalizeFrontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

const normalizeBackendUrl = () =>
  (process.env.BACKEND_URL || "").replace(/\/$/, "");

const isLocalUrl = (value) => /localhost|127\.0\.0\.1/i.test(value);

const logger = createLogger("checkoutControllers");

/**
 * Validate configuration before attempting a preference creation.
 *
 * Rules (per official MP docs):
 *  - TEST tokens work with any back_url (including localhost).
 *    Only the notification_url needs to be a live HTTPS address for webhooks
 *    to actually arrive; if it's local we simply omit it.
 *  - Production tokens (APP_USR-) require HTTPS public URLs everywhere.
 *
 * Returns null if everything is OK, or an error string to send to the client.
 */
const getMercadoPagoBlockingError = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token) {
    return "Mercado Pago no está configurado todavía en el servidor. Agregá MERCADO_PAGO_ACCESS_TOKEN al .env.";
  }

  // Test tokens work locally — no blocking error
  if (isTestToken(token)) return null;

  // Production token — enforce public URLs
  const frontendUrl = normalizeFrontendUrl();
  const backendUrl = normalizeBackendUrl();

  if (!backendUrl) {
    return "BACKEND_URL no está configurado. En producción, Mercado Pago necesita una URL pública para las notificaciones.";
  }

  if (isLocalUrl(frontendUrl) || isLocalUrl(backendUrl)) {
    return "Estás usando un token de producción con URLs locales. Configurá FRONTEND_URL y BACKEND_URL con URLs HTTPS públicas.";
  }

  return null;
};

// ---------------------------------------------------------------------------
// Webhook signature validation
// Docs: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Webhook signature validation - NOW MANDATORY IN PRODUCTION
// Docs: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
// ---------------------------------------------------------------------------

const validateMercadoPagoSignature = (req) => {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  // In production, webhook secret is MANDATORY
  if (isProduction && !secret) {
    logger.error("MERCADOPAGO_WEBHOOK_SECRET not configured in production");
    return false;
  }

  // In development without secret, allow webhook (for testing)
  if (!secret) {
    logger.warn(
      "Webhook processed without signature validation (development mode)",
    );
    return true;
  }

  try {
    const signature = req.headers["x-signature"];
    const requestId = req.headers["x-request-id"];

    if (!signature || !requestId) {
      logger.warn("Webhook: missing signature or request-id headers");
      return false;
    }

    const parts = signature.split(",");
    const ts = parts.find((p) => p.startsWith("ts="))?.split("=")[1];
    const hash = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

    if (!ts || !hash) {
      logger.warn("Webhook: invalid signature format");
      return false;
    }

    const dataId =
      req.body?.data?.id || req.query["data.id"] || req.query.id || "";

    // Manifest format per official docs: id:<dataId>;request-id:<xRequestId>;ts:<ts>;
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );

    if (!isValid) {
      logger.warn(
        { dataId, requestId },
        "Webhook: signature validation failed",
      );
    }

    return isValid;
  } catch (error) {
    logger.error(error, "Webhook: signature validation error");
    return false;
  }
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
const PAYMENT_STATUS_MAP = {
  approved: "approved",
  authorized: "approved",
  in_process: "in_process",
  pending: "pending",
  rejected: "rejected",
  cancelled: "cancelled",
  refunded: "cancelled",
  charged_back: "cancelled",
};

const buildCheckoutReturnUrl = (pathname, orderId) => {
  const url = new URL(pathname, `${normalizeFrontendUrl()}/`);
  url.searchParams.set("orderId", orderId);
  return url.toString();
};

const buildProductLookup = async (items) => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await ProductModel.find({
    _id: { $in: productIds },
    isActive: true,
  }).select("_id title category image price stock");

  if (products.length !== productIds.length) return null;

  return new Map(products.map((p) => [p._id.toString(), p]));
};

const parseCheckoutPayload = (req) =>
  createCheckoutPreferenceSchema.parse({
    items: (req.body?.items || []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  });

const maybeReserveStockAfterApproval = async (order) => {
  const operations = order.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product, stock: { $gte: item.quantity } },
      update: { $inc: { stock: -item.quantity } },
    },
  }));

  if (operations.length > 0) {
    const result = await ProductModel.bulkWrite(operations);

    if (result.modifiedCount < operations.length) {
      console.warn(
        `[checkout] Stock reservation partial for order ${order._id}: ` +
          `${result.modifiedCount}/${operations.length} items decremented`,
      );
    }
  }
};

/**
 * Build a single MP preference item.
 * Only include picture_url when it is a publicly accessible HTTP URL — base64
 * data URIs or local paths are rejected by the MP API.
 */
const buildMercadoPagoItem = (item) => {
  const preferenceItem = {
    id: item.product.toString(),
    title: String(item.title).slice(0, 256), // MP title max 256 chars
    description: String(item.title).slice(0, 256),
    quantity: item.quantity,
    unit_price: item.unitPrice,
    currency_id: "ARS",
  };

  if (/^https?:\/\//i.test(item.image)) {
    preferenceItem.picture_url = item.image;
  }

  return preferenceItem;
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------
export const createMercadoPagoPreference = async (req, res) => {
  try {
    const blockingError = getMercadoPagoBlockingError();

    if (blockingError) {
      return res.status(400).json({ message: blockingError });
    }

    const { items } = parseCheckoutPayload(req);
    const productLookup = await buildProductLookup(items);

    if (!productLookup) {
      return res
        .status(400)
        .json({ message: "Uno o más productos no están disponibles." });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = productLookup.get(item.productId);

      if (!product) {
        return res
          .status(400)
          .json({ message: "Uno o más productos no están disponibles." });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `No hay stock suficiente para "${product.title}".`,
        });
      }

      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.image,
        category: product.category || "",
        quantity: item.quantity,
        unitPrice: product.price,
      });

      totalAmount += product.price * item.quantity;
    }

    const order = await OrderModel.create({
      user: req.user._id,
      userEmail: req.user.email,
      items: orderItems,
      totalAmount,
      currency: "ARS",
      status: "pending",
      paymentProvider: "mercadopago",
    });

    const orderId = order._id.toString();
    const successUrl = buildCheckoutReturnUrl("/checkout/success", orderId);
    const failureUrl = buildCheckoutReturnUrl("/checkout/failure", orderId);
    const pendingUrl = buildCheckoutReturnUrl("/checkout/pending", orderId);
    const backendUrl = normalizeBackendUrl();
    const token = getAccessToken();
    const testMode = isTestToken(token);
    const { preference } = getMercadoPagoClients();

    const preferenceBody = {
      items: orderItems.map(buildMercadoPagoItem),
      payer: { email: req.user.email },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      // auto_return: only supported when all back_urls are HTTPS public URLs
      // In test mode with localhost URLs we skip it to avoid the API error
      ...(testMode || !isLocalUrl(normalizeFrontendUrl()) ? {} : {}),
      external_reference: orderId,
      metadata: {
        orderId,
        userId: req.user._id.toString(),
        environment: testMode ? "test" : "production",
      },
    };

    // Only include notification_url when it is a publicly reachable address
    if (backendUrl && !isLocalUrl(backendUrl)) {
      preferenceBody.notification_url = `${backendUrl}/api/checkout/mercadopago/webhook`;
    }

    const preferenceResponse = await preference.create({
      body: preferenceBody,
      requestOptions: { idempotencyKey: orderId },
    });

    const checkoutUrl = testMode
      ? preferenceResponse.sandbox_init_point || preferenceResponse.init_point
      : preferenceResponse.init_point || preferenceResponse.sandbox_init_point;

    if (!checkoutUrl || !preferenceResponse.id) {
      return res.status(502).json({
        message: "Mercado Pago no devolvió una URL de checkout válida.",
      });
    }

    order.mercadoPago.preferenceId = preferenceResponse.id;
    order.mercadoPago.initPoint = checkoutUrl;
    await order.save();

    return res.status(201).json({
      message: "Checkout creado correctamente.",
      orderId,
      preferenceId: preferenceResponse.id,
      checkoutUrl,
      testMode,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "El carrito enviado no es válido.",
        issues: error.flatten(),
      });
    }

    if (
      error instanceof Error &&
      error.message.includes("MERCADO_PAGO_ACCESS_TOKEN")
    ) {
      return res.status(503).json({
        message: "Mercado Pago no está configurado todavía en el servidor.",
      });
    }

    console.error("[checkout] preference creation error:", error);
    return res.status(500).json({
      message:
        error?.cause?.[0]?.description ||
        error?.message ||
        "No se pudo crear la compra. Revisá la configuración de Mercado Pago.",
    });
  }
};

export const mercadoPagoWebhook = async (req, res) => {
  try {
    // Validate signature - will reject in production if no secret
    if (!validateMercadoPagoSignature(req)) {
      logger.warn("Webhook rejected: invalid signature");
      return res.status(401).json({ error: "Invalid webhook signature." });
    }

    const notificationType =
      req.body?.type || req.query.type || req.body?.topic || req.query.topic;
    const paymentId =
      req.body?.data?.id ||
      req.query["data.id"] ||
      req.body?.id ||
      req.query.id;

    if (notificationType !== "payment" || !paymentId) {
      logger.debug(
        { notificationType, paymentId },
        "Webhook: non-payment notification",
      );
      return res.status(200).json({ received: true });
    }

    const { payment } = getMercadoPagoClients();
    const paymentData = await payment.get({ id: String(paymentId) });
    const orderId = paymentData.external_reference;

    if (!orderId) {
      logger.warn({ paymentId }, "Webhook: no orderId in payment data");
      return res.status(200).json({ received: true });
    }

    const order = await OrderModel.findById(orderId);

    if (!order) {
      logger.warn({ orderId }, "Webhook: order not found");
      return res.status(200).json({ received: true });
    }

    const previousStatus = order.status;
    const nextStatus = PAYMENT_STATUS_MAP[paymentData.status] || "pending";

    order.status = nextStatus;
    order.mercadoPago.paymentId = paymentData.id || null;
    order.mercadoPago.status = paymentData.status || "";
    order.mercadoPago.statusDetail = paymentData.status_detail || "";
    order.mercadoPago.merchantOrderId = paymentData.order?.id
      ? String(paymentData.order.id)
      : "";

    await order.save();

    logger.info(
      { orderId, previousStatus, nextStatus, paymentId },
      "Order status updated",
    );

    if (previousStatus !== "approved" && nextStatus === "approved") {
      await maybeReserveStockAfterApproval(order);

      try {
        await sendAdminPurchaseEmail(order);
      } catch (notificationError) {
        logger.error(
          { orderId, error: notificationError.message },
          "Admin email notification failed",
        );
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error(
      { error: error.message, requestId: req.headers["x-request-id"] },
      "Webhook handler error",
    );
    // Always return 200 to prevent MP from retrying indefinitely
    return res.status(200).json({ received: true });
  }
};

export const getOrderStatus = async (req, res) => {
  try {
    const order = await OrderModel.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    }).select(
      "_id totalAmount currency status items mercadoPago createdAt updatedAt",
    );

    if (!order) {
      return res.status(404).json({ message: "Compra no encontrada." });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("[order] getOrderStatus error:", error);
    return res.status(500).json({ message: "No se pudo obtener la compra." });
  }
};

export const getAdminOrders = async (_req, res) => {
  try {
    const orders = await OrderModel.find({})
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .select(
        "_id user userEmail items totalAmount currency status mercadoPago createdAt updatedAt",
      );

    return res.status(200).json(orders);
  } catch (error) {
    console.error("[order] getAdminOrders error:", error);
    return res
      .status(500)
      .json({ message: "No se pudieron cargar las órdenes." });
  }
};
