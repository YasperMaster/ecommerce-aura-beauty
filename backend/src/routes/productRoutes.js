import express from "express";
import {
  createProduct,
  deleteProduct,
  getAdminProducts,
  getProductById,
  getProducts,
  updateProduct,
} from "../controllers/productControllers.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/v1/products
 * @desc    Get all active products
 * @access  Public
 */
router.get("/", getProducts);

/**
 * @route   GET /api/v1/products/:productId
 * @desc    Get product by ID
 * @access  Public
 */
router.get("/:productId", getProductById);

/**
 * @route   GET /api/v1/products/admin
 * @desc    Get all products for admin (including inactive)
 * @access  Private (Admin only)
 */
router.get("/admin", requireAuth, requireAdmin, getAdminProducts);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Private (Admin only)
 */
router.post("/", requireAuth, requireAdmin, createProduct);

/**
 * @route   PUT /api/v1/products/:productId
 * @desc    Update product
 * @access  Private (Admin only)
 */
router.put("/:productId", requireAuth, requireAdmin, updateProduct);

/**
 * @route   DELETE /api/v1/products/:productId
 * @desc    Delete product
 * @access  Private (Admin only)
 */
router.delete("/:productId", requireAuth, requireAdmin, deleteProduct);

export default router;
