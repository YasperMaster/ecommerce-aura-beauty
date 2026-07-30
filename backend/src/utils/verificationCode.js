import crypto from "crypto";

export const CODE_TTL_MS = 15 * 60 * 1000; // code + pending signup expire after 15 min
export const MAX_VERIFICATION_ATTEMPTS = 5; // wrong guesses allowed before code is invalidated
export const RESEND_COOLDOWN_MS = 60 * 1000; // min time between resend requests

/**
 * Cryptographically-random 6-digit code, zero-padded (e.g. "004821").
 * crypto.randomInt is uniform over [0, 1_000_000) — no modulo bias.
 */
export const generateVerificationCode = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

/**
 * We only ever store a hash of the code, never the plaintext, the same way
 * passwords are never stored in plaintext. SHA-256 (not bcrypt) is fine
 * here: the code is short-lived (15 min), single-use, and rate-limited —
 * bcrypt's slow-hashing property protects against offline brute force,
 * which isn't the threat model for a code that's already expired by the
 * time an attacker could brute force it offline.
 */
export const hashVerificationCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");

/**
 * Constant-time comparison to avoid leaking the correct hash via timing.
 */
export const verifyCodeHash = (code, hash) => {
  const candidate = Buffer.from(hashVerificationCode(code));
  const expected = Buffer.from(hash);

  if (candidate.length !== expected.length) return false;

  return crypto.timingSafeEqual(candidate, expected);
};
