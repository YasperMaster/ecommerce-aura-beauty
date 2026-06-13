import express from "express";
import {
  createMercadoPagoPreference,
  getAdminOrders,
  getOrderStatus,
  mercadoPagoWebhook,
} from "../controllers/checkoutControllers.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";
import { checkoutLimiter, webhookLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.post(
  "/mercadopago/preference",
  requireAuth,
  checkoutLimiter,
  createMercadoPagoPreference,
);
router.post("/mercadopago/webhook", webhookLimiter, mercadoPagoWebhook);
router.get("/orders/admin", requireAuth, requireAdmin, getAdminOrders);
router.get("/orders/:orderId", requireAuth, getOrderStatus);

export default router;
