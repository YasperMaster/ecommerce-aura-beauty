import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import {
  loginSchema,
  registerSchema,
  resendCodeSchema,
  verifyEmailSchema,
} from "../schemas/authSchema.js";
import UserModel from "../models/UserModel.js";
import PendingUserModel from "../models/PendingUserModel.js";
import {
  COOKIE_NAME,
  getAuthClearCookieOptions,
  getAuthCookieOptions,
  sanitizeUser,
  signAuthToken,
} from "../utils/auth.js";
import { createLogger, sanitizeForLog } from "../utils/logger.js";
import { sendVerificationEmail } from "../utils/emailNotifications.js";
import {
  CODE_TTL_MS,
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  generateVerificationCode,
  hashVerificationCode,
  verifyCodeHash,
} from "../utils/verificationCode.js";

const logger = createLogger("authControllers");

const normalizeEmail = (email) => email.trim().toLowerCase();

const handleAuthError = (res, error) => {
  if (error instanceof ZodError) {
    logger.warn({ errors: error.flatten() }, "Validation error");
    return res.status(400).json({
      message: "The provided data is invalid.",
      issues: error.flatten(),
    });
  }

  // Duplicate key — email already registered
  if (error?.code === 11000) {
    logger.warn(
      { email: error.keyValue?.email },
      "Duplicate email registration attempt",
    );
    return res.status(409).json({
      message: "Ese email ya está registrado.",
    });
  }

  // Log the actual error server-side for debugging
  logger.error(sanitizeForLog(error), "Authentication error");

  // Don't expose internal errors to client
  return res.status(500).json({
    message: "An authentication error occurred. Please try again later.",
  });
};

const issueSession = (res, user, statusCode, message) => {
  const token = signAuthToken(user);

  logger.info(
    { userId: user._id, email: user.email },
    "Session issued successfully",
  );

  return res
    .cookie(COOKIE_NAME, token, getAuthCookieOptions())
    .status(statusCode)
    .json({
      message,
      user: sanitizeUser(user),
    });
};

/**
 * Step 1 of registration: validate + stash the signup as a PendingUser and
 * email a 6-digit code. No real User document is created here — that only
 * happens once verifyEmail() confirms the code (see below).
 */
export const registerUser = async (req, res) => {
  try {
    const parsedData = registerSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);
    const username = parsedData.username.trim();

    logger.info({ email }, "Registration attempt");

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      logger.warn({ email }, "Registration: email already exists");
      return res
        .status(409)
        .json({ message: "Ese email ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(parsedData.password, 10);
    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Upsert: if this email already has an unconfirmed pending signup
    // (e.g. they registered but never entered the code), overwrite it with
    // fresh data + a new code instead of erroring on the unique index.
    await PendingUserModel.findOneAndUpdate(
      { email },
      { email, username, password: hashedPassword, codeHash, attempts: 0, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await sendVerificationEmail({ email, username, code });

    logger.info({ email }, "Verification code sent");

    return res.status(200).json({
      message:
        "We sent a 6-digit confirmation code to your email. Enter it to activate your account.",
      email,
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

/**
 * Step 2 of registration: confirm the code and create the real User.
 * This is the only place a User document gets created via signup.
 */
export const verifyEmail = async (req, res) => {
  try {
    const parsedData = verifyEmailSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    const pendingUser = await PendingUserModel.findOne({ email });

    if (!pendingUser) {
      logger.warn({ email }, "Verify: no pending registration found");
      return res.status(400).json({
        message:
          "No pending registration found for this email. Please register again.",
      });
    }

    if (pendingUser.expiresAt < new Date()) {
      await PendingUserModel.deleteOne({ _id: pendingUser._id });
      logger.warn({ email }, "Verify: code expired");
      return res
        .status(400)
        .json({ message: "This code has expired. Please request a new one." });
    }

    if (pendingUser.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await PendingUserModel.deleteOne({ _id: pendingUser._id });
      logger.warn({ email }, "Verify: too many attempts, code invalidated");
      return res.status(429).json({
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    const isValidCode = verifyCodeHash(parsedData.code, pendingUser.codeHash);

    if (!isValidCode) {
      pendingUser.attempts += 1;
      await pendingUser.save();
      logger.warn(
        { email, attempts: pendingUser.attempts },
        "Verify: incorrect code",
      );
      return res
        .status(400)
        .json({ message: "Incorrect code. Please try again." });
    }

    // Re-check uniqueness at creation time too — guards against a race
    // where the same email was confirmed twice concurrently.
    const isFirstUser = (await UserModel.countDocuments()) === 0;

    const newUser = await UserModel.create({
      username: pendingUser.username,
      email: pendingUser.email,
      password: pendingUser.password,
      isAdmin: isFirstUser,
    });

    await PendingUserModel.deleteOne({ _id: pendingUser._id });

    logger.info(
      { userId: newUser._id, email, isAdmin: isFirstUser },
      "Email confirmed, user created",
    );

    return issueSession(
      res,
      newUser,
      201,
      "Account confirmed and created successfully.",
    );
  } catch (error) {
    return handleAuthError(res, error);
  }
};

/**
 * Lets a user request a fresh code if the first one expired or was lost.
 * Response is intentionally identical whether or not a pending signup
 * exists for the given email, to avoid leaking registration state.
 */
export const resendVerificationCode = async (req, res) => {
  const genericResponse = {
    message: "If a pending registration exists, a new code was sent.",
  };

  try {
    const parsedData = resendCodeSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    const pendingUser = await PendingUserModel.findOne({ email });

    if (!pendingUser) {
      return res.status(200).json(genericResponse);
    }

    const msSinceLastSend = Date.now() - pendingUser.updatedAt.getTime();
    if (msSinceLastSend < RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: "Please wait a moment before requesting another code.",
      });
    }

    const code = generateVerificationCode();
    pendingUser.codeHash = hashVerificationCode(code);
    pendingUser.attempts = 0;
    pendingUser.expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await pendingUser.save();

    await sendVerificationEmail({
      email: pendingUser.email,
      username: pendingUser.username,
      code,
    });

    logger.info({ email }, "Verification code resent");

    return res.status(200).json(genericResponse);
  } catch (error) {
    return handleAuthError(res, error);
  }
};

export const loginUser = async (req, res) => {
  try {
    const parsedData = loginSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    logger.info({ email }, "Login attempt");

    const user = await UserModel.findOne({ email });

    if (!user) {
      logger.warn({ email }, "Login: user not found");
      return res
        .status(401)
        .json({ message: "Email or password is incorrect." });
    }

    const isValidPassword = await bcrypt.compare(
      parsedData.password,
      user.password,
    );

    if (!isValidPassword) {
      logger.warn({ email }, "Login: invalid password");
      return res
        .status(401)
        .json({ message: "Email or password is incorrect." });
    }

    logger.info({ userId: user._id, email }, "Login successful");

    return issueSession(res, user, 200, "Login successful.");
  } catch (error) {
    return handleAuthError(res, error);
  }
};

export const logoutUser = async (_req, res) => {
  logger.info("User logout");
  return res
    .clearCookie(COOKIE_NAME, getAuthClearCookieOptions())
    .status(200)
    .json({ message: "Logout successful." });
};

export const profile = async (req, res) => {
  logger.info({ userId: req.user._id }, "Profile requested");
  return res.status(200).json(sanitizeUser(req.user));
};
