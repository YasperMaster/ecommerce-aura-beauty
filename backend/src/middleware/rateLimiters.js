import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos. Volvé a intentarlo en unos minutos.",
  },
});

export const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos de compra. Intentá de nuevo en unos minutos.",
  },
});

// Stricter than authLimiter: this endpoint is what an attacker would hit to
// brute-force a 6-digit code. Combined with MAX_VERIFICATION_ATTEMPTS
// (invalidates the code after 5 wrong guesses) and the 15-min code expiry,
// this makes brute-forcing a code impractical.
export const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos. Volvé a intentarlo en unos minutos.",
  },
});

export const resendCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Demasiados intentos. Volvé a intentarlo en unos minutos.",
  },
});

export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
