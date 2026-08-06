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

/**
 * Reserve stock atomically at order creation time.
 *
 * Decrements stock for each item one by one, rolling back any successful
 * decrements if a later item doesn't have enough stock. This prevents the
 * race condition where two customers could check out the same last item
 * simultaneously.
 *
 * Returns true if all items were reserved, false otherwise (with rollback).
 */
const reserveStock = async (order) => {
  const decremented = [];

  for (const item of order.items) {
    const result = await ProductModel.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
    );

    if (result.modifiedCount === 0) {
      // This item doesn't have enough stock — rollback previous decrements
      logger.warn(
        { orderId: order._id, productId: item.product },
        "Stock reservation failed — insufficient stock, rolling back",
      );

      for (const d of decremented) {
        await ProductModel.updateOne(
          { _id: d.product },
          { $inc: { stock: d.quantity } },
        );
      }

      return false;
    }

    decremented.push({ product: item.product, quantity: item.quantity });
  }

  return true;
};

/**
 * Restore stock for an order (e.g. when payment is rejected or cancelled).
 */
const restoreStock = async (order) => {
  const operations = order.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity } },
    },
  }));

  if (operations.length > 0) {
    await ProductModel.bulkWrite(operations);
    logger.info({ orderId: order._id }, "Stock restored for order");
  }
};

/**
 * Sync a single order's status from Mercado Pago.
 *
 * This is the fallback path for environments where webhooks cannot reach the
 * backend (e.g. local development, or a misconfigured notification_url).
 * It queries the Mercado Pago payments search API by external_reference
 * (which we set to the orderId when creating the preference) and updates the
 * order in the database if the payment status has changed.
 *
 * Returns the (possibly updated) order document, or null if the order is not
 * found or Mercado Pago is unavailable.
 */
const syncOrderFromMercadoPago = async (order) => {
  // Only sync orders that are still in a non-terminal state
  const nonTerminalStatuses = ["pending", "in_process"];
  if (!nonTerminalStatuses.includes(order.status)) {
    return order;
  }

  try {
    const { payment } = getMercadoPagoClients();
    const orderId = order._id.toString();

    const searchResult = await payment.search({
      options: { external_reference: orderId, limit: 1 },
    });

    const paymentData = searchResult.results?.[0];

    if (!paymentData) {
      // No payment found yet — the buyer may not have completed checkout
      return order;
    }

    const previousStatus = order.status;
    const nextStatus = PAYMENT_STATUS_MAP[paymentData.status] || "pending";

    if (previousStatus === nextStatus) {
      return order;
    }

    order.status = nextStatus;
    order.mercadoPago.paymentId = paymentData.id || null;
    order.mercadoPago.status = paymentData.status || "";
    order.mercadoPago.statusDetail = paymentData.status_detail || "";
    order.mercadoPago.merchantOrderId = paymentData.order?.id
      ? String(paymentData.order.id)
      : "";

    await order.save();

    logger.info(
      { orderId, previousStatus, nextStatus, paymentId: paymentData.id },
      "Order status synced from Mercado Pago",
    );

    // Stock is reserved at order creation time, so we only need to:
    // - Send admin email when payment is approved
    // - Restore stock when payment is rejected or cancelled
    if (previousStatus !== "approved" && nextStatus === "approved") {
      try {
        await sendAdminPurchaseEmail(order);
        order.adminNotified = true;
        await order.save();
      } catch (notificationError) {
        logger.error(
          { orderId, error: notificationError.message },
          "Admin email notification failed during sync",
        );
      }
    } else if (
      ["rejected", "cancelled"].includes(nextStatus) &&
      !["rejected", "cancelled"].includes(previousStatus)
    ) {
      await restoreStock(order);
    }

    return order;
  } catch (error) {
    logger.error(
      { orderId: order._id, error: error.message },
      "Failed to sync order from Mercado Pago",
    );
    return order;
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
      fullName: req.user.fullName || "",
      userPhone: req.user.phone || "",
      items: orderItems,
      totalAmount,
      currency: "ARS",
      status: "pending",
      paymentProvider: "mercadopago",
    });

    // Reserve stock immediately to prevent race conditions where two
    // customers could buy the same last item simultaneously. If any item
    // doesn't have enough stock, delete the order and return an error.
    const stockReserved = await reserveStock(order);

    if (!stockReserved) {
      await OrderModel.findByIdAndDelete(order._id);
      return res.status(400).json({
        message:
          "No hay stock suficiente para uno o más productos en tu carrito.",
      });
    }

    const orderId = order._id.toString();
    const successUrl = buildCheckoutReturnUrl("/checkout/success", orderId);
    const failureUrl = buildCheckoutReturnUrl("/checkout/failure", orderId);
    const pendingUrl = buildCheckoutReturnUrl("/checkout/pending", orderId);
    const backendUrl = normalizeBackendUrl();
    const token = getAccessToken();
    const testMode = isTestToken(token);
    const { preference } = getMercadoPagoClients();

    const frontendUrl = normalizeFrontendUrl();
    const preferenceBody = {
      items: orderItems.map(buildMercadoPagoItem),
      payer: { email: req.user.email },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      external_reference: orderId,
      metadata: {
        orderId,
        userId: req.user._id.toString(),
        environment: testMode ? "test" : "production",
      },
    };

    // auto_return and notification_url require public HTTPS URLs.
    // Only include them when not running on localhost.
    if (!isLocalUrl(frontendUrl)) {
      preferenceBody.auto_return = "approved";
    }

    if (backendUrl && !isLocalUrl(backendUrl)) {
      preferenceBody.notification_url = `${backendUrl}/api/v1/checkout/mercadopago/webhook`;
    }

    const preferenceResponse = await preference.create({
      body: preferenceBody,
      requestOptions: { idempotencyKey: orderId },
    });

    const checkoutUrl = testMode
      ? preferenceResponse.sandbox_init_point || preferenceResponse.init_point
      : preferenceResponse.init_point || preferenceResponse.sandbox_init_point;

    if (!checkoutUrl || !preferenceResponse.id) {
      // Preference creation failed — restore stock and delete the order
      await restoreStock(order);
      await OrderModel.findByIdAndDelete(order._id);
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
      return res.status(401).json({ error: "La firma del webhook no es válida." });
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

    // Idempotency: if the order is already in the target status and the
    // payment ID matches, skip processing. This prevents duplicate stock
    // decrements and duplicate admin emails when Mercado Pago retries the
    // same webhook notification (which it does routinely).
    if (
      previousStatus === nextStatus &&
      order.mercadoPago.paymentId === (paymentData.id || null)
    ) {
      logger.info(
        { orderId, status: nextStatus, paymentId },
        "Webhook: duplicate notification, already processed (idempotent skip)",
      );
      return res.status(200).json({ received: true });
    }

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

    // Stock is reserved at order creation time, so we only need to:
    // - Send admin email when payment is approved
    // - Restore stock when payment is rejected or cancelled
    if (previousStatus !== "approved" && nextStatus === "approved") {
      try {
        await sendAdminPurchaseEmail(order);
        order.adminNotified = true;
        await order.save();
      } catch (notificationError) {
        logger.error(
          { orderId, error: notificationError.message },
          "Admin email notification failed",
        );
      }
    } else if (
      ["rejected", "cancelled"].includes(nextStatus) &&
      !["rejected", "cancelled"].includes(previousStatus)
    ) {
      await restoreStock(order);
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
    });

    if (!order) {
      return res.status(404).json({ message: "Compra no encontrada." });
    }

    // Sync with Mercado Pago in case the webhook hasn't arrived yet
    // (common in local development where notification_url is omitted).
    // This ensures the user sees the up-to-date status when they return
    // from the Mercado Pago checkout.
    const syncedOrder = await syncOrderFromMercadoPago(order);

    // If the order is approved but the admin was never notified (e.g. the
    // webhook never arrived and the sync already found it approved), send
    // the notification now. This is the fallback for local development.
    if (syncedOrder.status === "approved" && !syncedOrder.adminNotified) {
      try {
        await sendAdminPurchaseEmail(syncedOrder);
        syncedOrder.adminNotified = true;
        await syncedOrder.save();
      } catch (notificationError) {
        logger.error(
          { orderId: syncedOrder._id, error: notificationError.message },
          "Admin email notification failed on getOrderStatus fallback",
        );
      }
    }

    return res.status(200).json(syncedOrder);
  } catch (error) {
    console.error("[order] getOrderStatus error:", error);
    return res.status(500).json({ message: "No se pudo obtener la compra." });
  }
};

/**
 * Returns the current user's own purchase history — only orders that
 * actually completed (status "approved"), since pending/rejected/cancelled
 * orders aren't purchases the customer would expect to see listed here.
 * Powers the "Mis compras" page.
 */
export const getMyOrders = async (req, res) => {
  try {

    const SYNC_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    const pendingOrders = await OrderModel.find({
      user: req.user._id,
      status: { $in: ["pending", "in_process"] },
      createdAt: { $gte: new Date(now - SYNC_WINDOW_MS) },
    });

    await Promise.all(pendingOrders.map((order) => syncOrderFromMercadoPago(order)));
    const orders = await OrderModel.find({
      user: req.user._id,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .select("_id items totalAmount currency status createdAt");

    return res.status(200).json(orders);
  } catch (error) {
    console.error("[order] getMyOrders error:", error);
    return res
      .status(500)
      .json({ message: "No se pudieron cargar tus compras." });
  }
};

export const getAdminOrders = async (_req, res) => {
  try {
    const orders = await OrderModel.find({})
      .populate("user", "fullName email")
      .sort({ createdAt: -1 })
      .select(
        "_id user userEmail userPhone items totalAmount currency status mercadoPago createdAt updatedAt",
      );

    // Sync only recent non-terminal orders (created within the last 30
    // minutes) to avoid making unnecessary Mercado Pago API calls for
    // every order on every dashboard load. In production, webhooks keep
    // order statuses up-to-date; this sync is a fallback for when
    // webhooks are unavailable (e.g. local development).
    const SYNC_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    const syncedOrders = await Promise.all(
      orders.map((order) => {
        const isRecent = now - order.createdAt.getTime() < SYNC_WINDOW_MS;
        if (isRecent) {
          return syncOrderFromMercadoPago(order);
        }
        return order;
      }),
    );

    return res.status(200).json(syncedOrders);
  } catch (error) {
    console.error("[order] getAdminOrders error:", error);
    return res
      .status(500)
      .json({ message: "No se pudieron cargar las órdenes." });
  }
};
