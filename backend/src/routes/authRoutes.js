import express from "express";
import {
  forgotPassword,
  loginUser,
  logoutUser,
  profile,
  registerUser,
  resendVerificationCode,
  resetPassword,
  verifyEmail,
} from "../controllers/authControllers.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  authLimiter,
  forgotPasswordLimiter,
  resendCodeLimiter,
  resetPasswordLimiter,
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
 * @route   POST /api/v1/auth/forgot-password
 * @desc    If the email is registered, email a 6-digit password-reset code.
 * @access  Public
 */
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Confirm the code and set a new password. Logs the user in.
 * @access  Public
 */
router.post("/reset-password", resetPasswordLimiter, resetPassword);

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
