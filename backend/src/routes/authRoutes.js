import express from "express";
import {
  loginUser,
  logoutUser,
  profile,
  registerUser,
  resendVerificationCode,
  verifyEmail,
} from "../controllers/authControllers.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  authLimiter,
  resendCodeLimiter,
  verifyCodeLimiter,
} from "../middleware/rateLimiters.js";

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Start registration: validate data, stash as pending, email a
 *          6-digit code. Does NOT create a User yet.
 * @access  Public
 */
router.post("/register", authLimiter, registerUser);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Confirm the 6-digit code and create the real User account.
 * @access  Public
 */
router.post("/verify-email", verifyCodeLimiter, verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-code
 * @desc    Resend a fresh 6-digit code for a pending registration.
 * @access  Public
 */
router.post("/resend-code", resendCodeLimiter, resendVerificationCode);

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
