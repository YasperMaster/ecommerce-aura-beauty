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

router.get("/", getProducts);
router.get("/admin", requireAuth, requireAdmin, getAdminProducts);
router.post("/", requireAuth, requireAdmin, createProduct);
router.put("/:productId", requireAuth, requireAdmin, updateProduct);
router.delete("/:productId", requireAuth, requireAdmin, deleteProduct);
router.get("/:productId", getProductById);

export default router;
