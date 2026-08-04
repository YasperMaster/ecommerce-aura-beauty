import { randomUUID } from "crypto";

const SESSION_COOKIE_NAME = "sid";
const isProduction = process.env.NODE_ENV === "production";

export const ensureSessionId = (req, res, next) => {
  let sessionId = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionId) {
    sessionId = randomUUID();
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    req.cookies = { ...req.cookies, [SESSION_COOKIE_NAME]: sessionId };
  }

  next();
};

export const getSessionIdentifier = (req) =>
  req.cookies?.[SESSION_COOKIE_NAME] || "";