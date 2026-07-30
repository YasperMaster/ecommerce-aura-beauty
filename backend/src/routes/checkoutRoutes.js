import express from "express";
import {
  createMercadoPagoPreference,
  getAdminOrders,
  getMyOrders,
  getOrderStatus,
  mercadoPagoWebhook,
} from "../controllers/checkoutControllers.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";
import { checkoutLimiter, webhookLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

/**
 * @route   POST /api/v1/checkout/mercadopago/preference
 * @desc    Create Mercado Pago checkout preference
 * @access  Private (Authenticated users only)
 */
router.post(
  "/mercadopago/preference",
  requireAuth,
  checkoutLimiter,
  createMercadoPagoPreference,
);

/**
 * @route   POST /api/v1/checkout/mercadopago/webhook
 * @desc    Handle Mercado Pago webhook notifications
 * @access  Public (but signature verified)
 */
router.post("/mercadopago/webhook", webhookLimiter, mercadoPagoWebhook);

/**
 * @route   GET /api/v1/checkout/orders/admin
 * @desc    Get all orders (admin view)
 * @access  Private (Admin only)
 */
router.get("/orders/admin", requireAuth, requireAdmin, getAdminOrders);

/**
 * @route   GET /api/v1/checkout/orders/mine
 * @desc    Get the current user's own purchase history (approved orders only)
 * @access  Private
 */
router.get("/orders/mine", requireAuth, getMyOrders);

/**
 * @route   GET /api/v1/checkout/orders/:orderId
 * @desc    Get order status (user's own order)
 * @access  Private
 */
router.get("/orders/:orderId", requireAuth, getOrderStatus);

export default router;
