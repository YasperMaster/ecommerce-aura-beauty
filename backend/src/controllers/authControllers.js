import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendCodeSchema,
  resetPasswordSchema,
  updatePhoneSchema,
  verifyEmailSchema,
} from "../schemas/authSchema.js";
import UserModel from "../models/UserModel.js";
import PendingUserModel from "../models/PendingUserModel.js";
import PasswordResetModel from "../models/PasswordResetModel.js";
import {
  COOKIE_NAME,
  getAuthClearCookieOptions,
  getAuthCookieOptions,
  sanitizeUser,
  signAuthToken,
} from "../utils/auth.js";
import { createLogger, sanitizeForLog } from "../utils/logger.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/emailNotifications.js";
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
      message: "Los datos ingresados no son válidos.",
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
    message: "Ocurrió un error de autenticación. Volvé a intentarlo más tarde.",
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
    const fullName = parsedData.fullName.trim();
    const phone = parsedData.phone.replace(/[\s-()]/g, "");

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
      { email, fullName, phone, password: hashedPassword, codeHash, attempts: 0, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await sendVerificationEmail({ email, fullName, code });

    logger.info({ email }, "Verification code sent");

    return res.status(200).json({
      message:
        "Te enviamos un código de 6 dígitos a tu email. Ingresalo para activar tu cuenta.",
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
          "No hay un registro pendiente para este email. Volvé a registrarte.",
      });
    }

    if (pendingUser.expiresAt < new Date()) {
      await PendingUserModel.deleteOne({ _id: pendingUser._id });
      logger.warn({ email }, "Verify: code expired");
      return res
        .status(400)
        .json({ message: "El código expiró. Pedí uno nuevo." });
    }

    if (pendingUser.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await PendingUserModel.deleteOne({ _id: pendingUser._id });
      logger.warn({ email }, "Verify: too many attempts, code invalidated");
      return res.status(429).json({
        message: "Demasiados intentos incorrectos. Pedí un código nuevo.",
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
        .json({ message: "El código es incorrecto. Volvé a intentarlo." });
    }

    const newUser = await UserModel.create({
      fullName: pendingUser.fullName,
      email: pendingUser.email,
      phone: pendingUser.phone,
      password: pendingUser.password,
      // Admin status is never granted via self-registration.
      // To make a user admin, set `isAdmin: true` directly on the
      // document in MongoDB (e.g. via Atlas's Collections UI).
    });

    await PendingUserModel.deleteOne({ _id: pendingUser._id });

    logger.info(
      { userId: newUser._id, email },
      "Email confirmed, user created",
    );

    return issueSession(
      res,
      newUser,
      201,
      "Cuenta confirmada y creada con éxito.",
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
    message: "Si hay un registro pendiente, se envió un código nuevo.",
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
        message: "Esperá un momento antes de pedir otro código.",
      });
    }

    const code = generateVerificationCode();
    pendingUser.codeHash = hashVerificationCode(code);
    pendingUser.attempts = 0;
    pendingUser.expiresAt = new Date(Date.now() + CODE_TTL_MS);
    await pendingUser.save();

    await sendVerificationEmail({
      email: pendingUser.email,
      fullName: pendingUser.fullName,
      code,
    });

    logger.info({ email }, "Verification code resent");

    return res.status(200).json(genericResponse);
  } catch (error) {
    return handleAuthError(res, error);
  }
};

/**
 * Step 1 of password reset: if the email belongs to a real account, email a
 * 6-digit code. Response is intentionally identical either way, so this
 * endpoint can't be used to check which emails are registered.
 */
export const forgotPassword = async (req, res) => {
  const genericResponse = {
    message:
      "Si ese email está registrado, te enviamos un código para restablecer tu contraseña.",
  };

  try {
    const parsedData = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    const user = await UserModel.findOne({ email });

    if (!user) {
      logger.info({ email }, "Forgot password: no account for this email");
      return res.status(200).json(genericResponse);
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    // Upsert: a repeated forgot-password request just overwrites the
    // previous pending reset with a fresh code, same as the register flow.
    await PasswordResetModel.findOneAndUpdate(
      { email },
      { email, codeHash, attempts: 0, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await sendPasswordResetEmail({ email, fullName: user.fullName, code });

    logger.info({ email }, "Password reset code sent");

    return res.status(200).json(genericResponse);
  } catch (error) {
    return handleAuthError(res, error);
  }
};

/**
 * Step 2 of password reset: confirm the code and set the new password.
 * On success this also logs the user in on the current device (fresh
 * session cookie) — worth knowing: existing sessions on OTHER devices are
 * NOT invalidated, since this app's JWTs have no server-side revocation
 * mechanism. If that matters for your threat model, see the note at the
 * end of this file's accompanying explanation.
 */
export const resetPassword = async (req, res) => {
  try {
    const parsedData = resetPasswordSchema.parse(req.body);
    const email = normalizeEmail(parsedData.email);

    const pendingReset = await PasswordResetModel.findOne({ email });

    if (!pendingReset) {
      logger.warn({ email }, "Reset password: no pending reset found");
      return res.status(400).json({
        message:
          "No hay un restablecimiento pendiente para este email. Pedí un código nuevo.",
      });
    }

    if (pendingReset.expiresAt < new Date()) {
      await PasswordResetModel.deleteOne({ _id: pendingReset._id });
      logger.warn({ email }, "Reset password: code expired");
      return res
        .status(400)
        .json({ message: "El código expiró. Pedí uno nuevo." });
    }

    if (pendingReset.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await PasswordResetModel.deleteOne({ _id: pendingReset._id });
      logger.warn({ email }, "Reset password: too many attempts, code invalidated");
      return res.status(429).json({
        message: "Demasiados intentos incorrectos. Pedí un código nuevo.",
      });
    }

    const isValidCode = verifyCodeHash(parsedData.code, pendingReset.codeHash);

    if (!isValidCode) {
      pendingReset.attempts += 1;
      await pendingReset.save();
      logger.warn(
        { email, attempts: pendingReset.attempts },
        "Reset password: incorrect code",
      );
      return res
        .status(400)
        .json({ message: "El código es incorrecto. Volvé a intentarlo." });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      // Account was deleted between the request and the confirmation.
      await PasswordResetModel.deleteOne({ _id: pendingReset._id });
      logger.warn({ email }, "Reset password: account no longer exists");
      return res.status(400).json({
        message: "Esta cuenta ya no existe.",
      });
    }

    user.password = await bcrypt.hash(parsedData.newPassword, 10);
    await user.save();

    await PasswordResetModel.deleteOne({ _id: pendingReset._id });

    logger.info({ userId: user._id, email }, "Password reset successfully");

    return issueSession(res, user, 200, "Contraseña restablecida con éxito.");
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
        .json({ message: "El email o la contraseña son incorrectos." });
    }

    const isValidPassword = await bcrypt.compare(
      parsedData.password,
      user.password,
    );

    if (!isValidPassword) {
      logger.warn({ email }, "Login: invalid password");
      return res
        .status(401)
        .json({ message: "El email o la contraseña son incorrectos." });
    }

    logger.info({ userId: user._id, email }, "Sesión iniciada");

    return issueSession(res, user, 200, "Sesión iniciada.");
  } catch (error) {
    return handleAuthError(res, error);
  }
};

export const logoutUser = async (_req, res) => {
  logger.info("User logout");
  return res
    .clearCookie(COOKIE_NAME, getAuthClearCookieOptions())
    .status(200)
    .json({ message: "Sesión cerrada." });
};

export const profile = async (req, res) => {
  logger.info({ userId: req.user._id }, "Profile requested");
  return res.status(200).json(sanitizeUser(req.user));
};

/**
 * Allows an authenticated user to update their phone number.
 */
export const updatePhone = async (req, res) => {
  try {
    const parsedData = updatePhoneSchema.parse(req.body);
    const phone = parsedData.phone.replace(/[\s-()]/g, "");

    req.user.phone = phone;
    await req.user.save();

    logger.info({ userId: req.user._id }, "Phone number updated");

    return res.status(200).json({
      message: "Teléfono actualizado con éxito.",
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};

/**
 * Allows an authenticated user to change their password by providing
 * their current password for verification.
 */
export const changePassword = async (req, res) => {
  try {
    const parsedData = changePasswordSchema.parse(req.body);

    const isCurrentPasswordValid = await bcrypt.compare(
      parsedData.currentPassword,
      req.user.password,
    );

    if (!isCurrentPasswordValid) {
      logger.warn({ userId: req.user._id }, "Change password: incorrect current password");
      return res
        .status(401)
        .json({ message: "La contraseña actual es incorrecta." });
    }

    req.user.password = await bcrypt.hash(parsedData.newPassword, 10);
    await req.user.save();

    logger.info({ userId: req.user._id }, "Password changed successfully");

    return res.status(200).json({
      message: "Contraseña actualizada con éxito.",
    });
  } catch (error) {
    return handleAuthError(res, error);
  }
};
