import { doubleCsrf } from "csrf-csrf";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("csrfProtection");

const isProduction = process.env.NODE_ENV === "production";

const csrfSecret =
  process.env.CSRF_SECRET ||
  (isProduction
    ? ""
    : "dev-only-insecure-csrf-secret-do-not-use-in-production");

if (isProduction && !process.env.CSRF_SECRET) {
  logger.error(
    "CSRF_SECRET is not configured in production — CSRF protection cannot be initialized safely",
  );
}

/**
 * csrf-csrf double-submit cookie CSRF protection.
 *
 * This library implements the double-submit cookie pattern:
 *  1. A CSRF token is generated and stored in a cookie (separate from the
 *     auth JWT cookie).
 *  2. The frontend must read that cookie and send the token back in the
 *     `X-CSRF-Token` header on every state-changing request.
 *  3. The middleware verifies that the header value matches the cookie value.
 *
 * This works alongside httpOnly auth cookies because the CSRF cookie is
 * readable by JavaScript (it has to be, so the frontend can send it back),
 * but the auth cookie is not — an attacker can't read either cookie
 * cross-site, so they can't forge a valid request.
 */
export const { generateToken, doubleCsrfProtection: csrfMiddleware } =
  doubleCsrf({
    getSecret: () => csrfSecret,
    cookieName: "csrf-token",
    cookieOptions: {
      httpOnly: false, // Frontend JS must read this to send it back
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    },
    size: 64,
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
    // The webhook endpoint receives notifications from Mercado Pago, which
    // cannot include a CSRF token. It's authenticated via HMAC signature
    // validation instead, so CSRF protection is not needed there.
    ignoredPaths: ["/api/v1/checkout/mercadopago/webhook"],
    getTokenFromRequest: (req) => req.headers["x-csrf-token"],
  });

/**
 * Middleware that generates a CSRF token and attaches it to the response
 * as a cookie. The frontend reads this cookie and includes the token in
 * the `X-CSRF-Token` header on subsequent POST/PUT/DELETE requests.
 */
export const issueCsrfToken = (req, res, next) => {
  const token = generateToken(res, req);
  res.locals.csrfToken = token;
  next();
};

/**
 * Returns the current CSRF token to the frontend so it can store it.
 * The token is also set as a cookie by generateToken() above.
 */
export const getCsrfToken = (req, res) => {
  const token = generateToken(res, req);
  res.json({ csrfToken: token });
};

export default csrfMiddleware;