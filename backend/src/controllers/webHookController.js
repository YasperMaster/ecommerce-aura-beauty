import OrderModel from "../models/OrderModel.js";
import ProductModel from "../models/ProductModel.js";
import { getMercadoPagoClients } from "../config/mercadoPago.js";
import { Payment } from "mercadopago";
import crypto from "crypto";

const validateSignature = (req, res) => {
  try {
    const signature = req.headers["x-signature"];
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return false;
    }

    const parts = signature.split(",");

    const ts = parts.find((part) => part.startWith("ts=").split("=")[1]);
    const hash = parts.find((part) => part.startWith("v1=").split("=")[1]);

    const xRequestId = req.headers["x-request-id"];

    let dataId;
    let webhookFormat = "unknown";
    if (req.body?.data?.id && req.body?.type === "payment") {
      dataId = req.body.data.id;
      webhookFormat = "v1";
    } else if (req.body?.resoucer && req.body?.topic === "payment") {
      dataId = req.body.resource;
      webhookFormat = "v2";
    } else {
      dataId = req.query.id || req.query["data.id"];
      webhookFormat = "fallback";
    }
    const manifest = `id:${dataId};request-id:${xRequestId};ts;${ts};`;
    const expectedHash = crypto
      .createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
    return isValid;
  } catch (error) {
    return false;
  }
};

const webHookController = async (req, res) => {
  const { type, topic } = req.body;

  if (type !== "payment" && topic !== "payment") {
    return res.status(400).json({ message: "Webhook ignored" });
  }

  if (!validateSignature(req)) {
    return res.status(401).json({ error: "not authorized" });
  }

  const { data } = req.body;

  const { id: paymentId } = data;

  const payment = await new Payment(getMercadoPagoClients).get({
    id: paymentId,
  });

  const order = await OrderModel.findById(payment.external_reference);

  if (!order) {
    return res.status(400).json({ message: "Order not found" });
  }

  if (payment.status === "approved") {
    await OrderModel.findByIdAndUpdate(order.id, {
      status: "approved",
    });

    order.mercadoPagoData.paymentId = paymentId;
    order.mercadoPagoData.paymentStatus = payment.status;
    order.mercadoPagoData.transactionAmount = payment.transaction_amount;
    order.mercadoPagoData.paymentMethodId = payment.payment_method_id;
    order.mercadoPagoData.paidAt = payment.date_approved;

    for (const item of order.products) {
      const product = await ProductModel.findById(item.productId);

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: "insufficient stock of " + product.name,
        });
      }

      product.stock -= item.quantity;
      await product.save();
    }

    await order.save();
  } else {
    await OrderModel.findByIdAndUpdate(order._id, {
      status: "rejected",
    });
  }

  res.status(200);
};

export default webHookController;
