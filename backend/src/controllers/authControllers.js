import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { loginSchema, registerSchema } from "../schemas/authSchema.js";
import UserModel from "../models/UserModel.js";
import {
  COOKIE_NAME,
  getAuthClearCookieOptions,
  getAuthCookieOptions,
  sanitizeUser,
  signAuthToken,
} from "../utils/auth.js";
import { createLogger, sanitizeForLog } from "../utils/logger.js";

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
      message: "That email is already registered.",
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

export const registerUser = async (req, res) => {
  try {
    const parsedData = registerSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    logger.info({ email }, "Registration attempt");

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      logger.warn({ email }, "Registration: email already exists");
      return res
        .status(409)
        .json({ message: "That email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(parsedData.password, 10);
    const isFirstUser = (await UserModel.countDocuments()) === 0;

    const newUser = await UserModel.create({
      username: parsedData.username.trim(),
      email,
      password: hashedPassword,
      isAdmin: isFirstUser,
    });

    logger.info(
      { userId: newUser._id, email, isAdmin: isFirstUser },
      "User registered successfully",
    );

    return issueSession(res, newUser, 201, "Account created successfully.");
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
