import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import pinoHttp from "pino-http";
import { validateEnvironment } from "./config/validateEnv.js";
import { logger } from "./utils/logger.js";
import { csrfMiddleware, getCsrfToken } from "./middleware/csrfProtection.js";
import { ensureSessionId } from "./middleware/sessionId.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";

validateEnvironment();

const app = express();
const isDevelopment = process.env.NODE_ENV !== "production";

const mercadoPagoApiUrl = process.env.MERCADO_PAGO_API || "";
const connectSrc = ["'self'"];
if (mercadoPagoApiUrl) {
  connectSrc.push(mercadoPagoApiUrl);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc,
        frameSrc: ["'self'", "https://www.mercadopago.com"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

const allowedOrigins = Array.from(
  new Set([
    ...(process.env.FRONTEND_URL || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...(isDevelopment
      ? ["http://localhost:5173", "http://127.0.0.1:5173"]
      : []),
  ]),
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  credentials: true,
  maxAge: 3600,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(
  pinoHttp({
    logger,
    quietReqLogger: false,
    reqCustomProps: (req) => ({
      method: req.method,
      url: req.url,
      userAgent: req.get("user-agent"),
    }),
  }),
);

app.use(cookieParser());
app.use(ensureSessionId);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

const mongoSanitizeOptions = {
  onSanitize: ({ key }) => {
    logger.warn({ key }, "Sanitized potentially malicious input");
  },
};

app.use((req, _res, next) => {
  try {
    if (req.body) req.body = mongoSanitize.sanitize(req.body, mongoSanitizeOptions);
    if (req.params) req.params = mongoSanitize.sanitize(req.params, mongoSanitizeOptions);
    next();
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/v1/csrf-token", getCsrfToken);

app.use("/api/v1/auth", csrfMiddleware, authRoutes);
app.use("/api/v1/products", csrfMiddleware, productRoutes);
app.use("/api/v1/checkout", csrfMiddleware, checkoutRoutes);

app.use((error, req, res, next) => {
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  const statusCode = error.status || error.statusCode || 500;
  const message = isDevelopment
    ? error.message
    : "Ocurrió un error. Volvé a intentarlo más tarde.";

  res.status(statusCode).json({
    message,
    ...(isDevelopment && { error: error.message, stack: error.stack }),
  });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

export { allowedOrigins };
export default app;
