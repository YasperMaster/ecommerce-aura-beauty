import { doubleCsrf } from "csrf-csrf";
import { createLogger } from "../utils/logger.js";
import { getSessionIdentifier } from "./sessionId.js";

const logger = createLogger("csrfProtection");
const isProduction = process.env.NODE_ENV === "production";

const csrfSecret =
  process.env.CSRF_SECRET ||
  (isProduction ? "" : "dev-only-insecure-csrf-secret-do-not-use-in-production");

if (isProduction && !process.env.CSRF_SECRET) {
  logger.error(
    "CSRF_SECRET is not configured in production — CSRF protection cannot be initialized safely",
  );
}

const WEBHOOK_PATH = "/mercadopago/webhook";

export const { generateCsrfToken, doubleCsrfProtection: csrfMiddleware } =
  doubleCsrf({
    getSecret: () => csrfSecret,
    getSessionIdentifier,
    cookieName: "csrf-token",
    cookieOptions: {
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    },
    size: 64,
    ignoredMethods: ["GET", "HEAD", "OPTIONS"],
    getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
    skipCsrfProtection: (req) => req.path === WEBHOOK_PATH,
  });

export const issueCsrfToken = (req, res, next) => {
  const token = generateCsrfToken(req, res);
  res.locals.csrfToken = token;
  next();
};

export const getCsrfToken = (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
};

export default csrfMiddleware;