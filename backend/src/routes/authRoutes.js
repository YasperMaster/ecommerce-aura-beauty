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

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authLimiter, registerUser);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and issue auth cookie
 * @access  Public
 */
router.post("/login", authLimiter, loginUser);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and clear auth cookie
 * @access  Public
 */
router.post("/logout", logoutUser);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get authenticated user profile
 * @access  Private
 */
router.get("/profile", requireAuth, profile);

export default router;
