import { ZodError } from "zod";
import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import { createCheckoutPreferenceSchema } from "../schemas/checkoutSchema.js";
import { getMercadoPagoClients } from "../config/mercadoPago.js";
import { sendAdminPurchaseEmail } from "../utils/emailNotifications.js";

const normalizeFrontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const normalizeBackendUrl = () =>
  (process.env.BACKEND_URL || "").replace(/\/$/, "");

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

const isLocalUrl = (value) => {
  return /localhost|127\.0\.0\.1/i.test(value);
};

const getMercadoPagoConfigError = () => {
  const frontendUrl = normalizeFrontendUrl();
  const backendUrl = normalizeBackendUrl();

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return "Mercado Pago no está configurado todavía en el servidor.";
  }

  if (!backendUrl) {
    return "BACKEND_URL no está configurado. Mercado Pago necesita una URL pública para notificaciones.";
  }

  if (isLocalUrl(frontendUrl) || isLocalUrl(backendUrl)) {
    return "Mercado Pago no acepta una configuración local para completar el checkout. Configurá FRONTEND_URL y BACKEND_URL públicas (por ejemplo con ngrok o un deploy) e intentá nuevamente.";
  }

  return "No se pudo iniciar el checkout de Mercado Pago. Revisá la configuración de tu cuenta y las URLs públicas del proyecto.";
};

const buildProductLookup = async (items) => {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await ProductModel.find({
    _id: { $in: productIds },
    isActive: true,
  }).select("_id title description category image price stock");

  if (products.length !== productIds.length) {
    return null;
  }

  return new Map(products.map((product) => [product._id.toString(), product]));
};

const parseCheckoutPayload = (req) => {
  return createCheckoutPreferenceSchema.parse({
    items: (req.body?.items || []).map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    })),
  });
};

const maybeReserveStockAfterApproval = async (order) => {
  const operations = order.items.map((item) => ({
    updateOne: {
      filter: {
        _id: item.product,
        stock: { $gte: item.quantity },
      },
      update: {
        $inc: { stock: -item.quantity },
      },
    },
  }));

  if (operations.length > 0) {
    await ProductModel.bulkWrite(operations);
  }
};

const buildMercadoPagoItem = (item) => {
  const preferenceItem = {
    id: item.product.toString(),
    title: item.title,
    description: item.title,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    currency_id: "ARS",
  };

  if (/^https?:\/\//i.test(item.image)) {
    preferenceItem.picture_url = item.image;
  }

  return preferenceItem;
};

export const createMercadoPagoPreference = async (req, res) => {
  try {
    const mercadoPagoConfigError = getMercadoPagoConfigError();

    if (
      mercadoPagoConfigError !==
        "No se pudo iniciar el checkout de Mercado Pago. Revisá la configuración de tu cuenta y las URLs públicas del proyecto." &&
      mercadoPagoConfigError !== ""
    ) {
      if (
        mercadoPagoConfigError.includes(
          "Mercado Pago no acepta una configuración local",
        ) ||
        mercadoPagoConfigError.includes("BACKEND_URL") ||
        mercadoPagoConfigError.includes("Mercado Pago no está configurado")
      ) {
        return res.status(400).json({ message: mercadoPagoConfigError });
      }
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
        return res
          .status(400)
          .json({ message: `No hay stock suficiente para ${product.title}.` });
      }

      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.image,
        category: product.category,
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

    const successUrl = buildCheckoutReturnUrl(
      "/checkout/success",
      order._id.toString(),
    );
    const failureUrl = buildCheckoutReturnUrl(
      "/checkout/failure",
      order._id.toString(),
    );
    const pendingUrl = buildCheckoutReturnUrl(
      "/checkout/pending",
      order._id.toString(),
    );
    const backendUrl = normalizeBackendUrl();
    const { preference } = getMercadoPagoClients();

    const preferenceBody = {
      items: orderItems.map(buildMercadoPagoItem),
      payer: {
        email: req.user.email,
      },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      external_reference: order._id.toString(),
      metadata: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
    };

    if (backendUrl) {
      preferenceBody.notification_url = `${backendUrl}/api/checkout/mercadopago/webhook`;
    }

    const preferenceResponse = await preference.create({
      body: preferenceBody,
    });

    const checkoutUrl =
      preferenceResponse.init_point || preferenceResponse.sandbox_init_point;

    if (!checkoutUrl || !preferenceResponse.id) {
      return res
        .status(502)
        .json({ message: "No se pudo iniciar el checkout de Mercado Pago." });
    }

    order.mercadoPago.preferenceId = preferenceResponse.id;
    order.mercadoPago.initPoint = checkoutUrl;
    await order.save();

    return res.status(201).json({
      message: "Checkout creado correctamente.",
      orderId: order._id.toString(),
      preferenceId: preferenceResponse.id,
      checkoutUrl,
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

    console.error(error);
    return res.status(500).json({
      message:
        error?.cause?.[0]?.description ||
        error?.message ||
        "No se pudo crear la compra. Revisá la configuración de Mercado Pago y las URLs públicas del proyecto.",
    });
  }
};

export const mercadoPagoWebhook = async (req, res) => {
  try {
    const notificationType =
      req.body?.type || req.query.type || req.body?.topic || req.query.topic;
    const paymentId =
      req.body?.data?.id ||
      req.query["data.id"] ||
      req.body?.id ||
      req.query.id;

    if (notificationType !== "payment" || !paymentId) {
      return res.status(200).json({ received: true });
    }

    const { payment } = getMercadoPagoClients();
    const paymentData = await payment.get({ id: String(paymentId) });
    const orderId = paymentData.external_reference;

    if (!orderId) {
      return res.status(200).json({ received: true });
    }

    const order = await OrderModel.findById(orderId);

    if (!order) {
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

    if (previousStatus !== "approved" && nextStatus === "approved") {
      await maybeReserveStockAfterApproval(order);

      try {
        await sendAdminPurchaseEmail(order);
      } catch (notificationError) {
        console.error(notificationError);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ received: true });
  }
};

export const getOrderStatus = async (req, res) => {
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
};

export const getAdminOrders = async (_req, res) => {
  const orders = await OrderModel.find({})
    .populate("user", "username email")
    .sort({ createdAt: -1 })
    .select(
      "_id user userEmail items totalAmount currency status mercadoPago createdAt updatedAt",
    );

  return res.status(200).json(orders);
};
