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

const normalizeEmail = (email) => email.trim().toLowerCase();

const handleAuthError = (res, error) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Los datos enviados no son válidos.",
      issues: error.flatten(),
    });
  }

  console.error(error);
  return res.status(500).json({ message: "Ocurrió un error inesperado." });
};

const issueSession = (res, user, statusCode, message) => {
  const token = signAuthToken(user);

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

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Ese correo electrónico ya está registrado." });
    }

    const hashedPassword = await bcrypt.hash(parsedData.password, 10);
    const isFirstUser = (await UserModel.countDocuments()) === 0;

    const newUser = await UserModel.create({
      username: parsedData.username.trim(),
      email,
      password: hashedPassword,
      isAdmin: isFirstUser,
    });

    return issueSession(res, newUser, 201, "Cuenta creada correctamente.");
  } catch (error) {
    return handleAuthError(res, error);
  }
};

export const loginUser = async (req, res) => {
  try {
    const parsedData = loginSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Correo o contraseña incorrectos." });
    }

    const isValidPassword = await bcrypt.compare(
      parsedData.password,
      user.password,
    );

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ message: "Correo o contraseña incorrectos." });
    }

    return issueSession(res, user, 200, "Inicio de sesión exitoso.");
  } catch (error) {
    return handleAuthError(res, error);
  }
};

export const logoutUser = async (_req, res) => {
  return res
    .clearCookie(COOKIE_NAME, getAuthClearCookieOptions())
    .status(200)
    .json({ message: "Sesión cerrada correctamente." });
};

export const profile = async (req, res) => {
  return res.status(200).json(sanitizeUser(req.user));
};
