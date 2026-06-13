import { Preference } from "mercadopago";
import { getMercadoPagoClients } from "../config/mercadoPago.js";
import OrderModel from "../models/OrderModel.js";
import { it, tr } from "zod/v4/locales";

const preference = new Preference(getMercadoPagoClients);

export const createPreference = async (req, res) => {
  try {
    const { items, payer } = req.body;
    if (!items || !items.length) {
      return res.status(480).json({
        success: false,
        message: "No items provided",
      });
    }
    if (!payer || !payer.email) {
      return res.status(480).json({
        success: false,
        message: "No email provided",
      });
    }

    const newOrder = new OrderModel({
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      totalAmount: items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      ),
      status: "pending",
      mercadoPagoData: {
        payerEmail: payer.email,
      },
    });
    const savedOrder = await newOrder.save();

    const result = await preference.create({
      body: {
        items: items,
        payer: {
          email: payer.email,
        },
        external_reference: savedOrder._id.toString(),
        back_urls: {
          success: `${process.env.FRONTEND_URL}payment/success`,
          failure: `${process.env.FRONTEND_URL}payment/failure`,
          pending: `${process.env.FRONTEND_URL}payment/pending`,
        },
        notification_url: `${process.env.BACKEND_URL || "http://localhost:3000"}/api/webhook`,
        metadata: {
          orderId: savedOrder._id.toString(),
        },
      },
    });
    console.log("result:", result);
    savedOrder.mercadoPagoData.preferenceId = result.id;
    await savedOrder.save();

    res.status(200).json({
      success: true,
      message: "Preference created successfully",
      paymentUrl: result.init_point,
      preferenceId: result.id,
    });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({
      success: false,
      message: "Error creating preference",
      error: error.message,
    });
  }
};
