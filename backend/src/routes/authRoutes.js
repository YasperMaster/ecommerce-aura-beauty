import express from "express";
import {
  loginUser,
  logoutUser,
  profile,
  registerUser,
} from "../controllers/authControllers.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/logout", logoutUser);
router.get("/profile", requireAuth, profile);

export default router;
