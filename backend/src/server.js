import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import pinoHttp from "pino-http";
import { connectDB, disconnectDB } from "./config/conifgdb.js";
import { seedProducts } from "./config/seedProducts.js";
import { validateEnvironment } from "./config/validateEnv.js";
import { logger } from "./utils/logger.js";
import { csrfMiddleware, getCsrfToken } from "./middleware/csrfProtection.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";

dotenv.config({
  path: new URL("../.env", import.meta.url),
});

validateEnvironment();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== "production";

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// 1. Helmet: Add security headers
// CSP: 'unsafe-inline' is removed from styleSrc. The frontend uses Tailwind
// CSS (external stylesheets), so inline styles are not needed. If any
// component uses inline styles, they should be moved to CSS classes.
// connectSrc only includes the Mercado Pago API URL if it is non-empty.
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
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

// 2. CORS configuration
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
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  credentials: true,
  maxAge: 3600,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// 3. Request logging (before body parsing for better request ID tracking)
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

// 4. Body parsing with size limits
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// 5. Data sanitization (prevent NoSQL injection)
// Express 5 exposes req.query as read-only; sanitize only mutable properties.
const mongoSanitizeOptions = {
  onSanitize: ({ key }) => {
    logger.warn({ key }, "Sanitized potentially malicious input");
  },
};

app.use((req, _res, next) => {
  try {
    if (req.body) {
      req.body = mongoSanitize.sanitize(req.body, mongoSanitizeOptions);
    }

    if (req.params) {
      req.params = mongoSanitize.sanitize(req.params, mongoSanitizeOptions);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================================================
// CSRF TOKEN ENDPOINT
// ============================================================================
// The frontend calls this on startup to get a CSRF token, which it then
// includes in the X-CSRF-Token header on all state-changing requests.
app.get("/api/v1/csrf-token", getCsrfToken);

// ============================================================================
// API ROUTES (V1)
// ============================================================================
// CSRF protection is applied to all routes. The webhook endpoint is
// excluded from CSRF within the checkout routes file itself, since
// Mercado Pago cannot send a CSRF token — it's authenticated via HMAC
// signature validation instead.
app.use("/api/v1/auth", csrfMiddleware, authRoutes);
app.use("/api/v1/products", csrfMiddleware, productRoutes);
app.use("/api/v1/checkout", csrfMiddleware, checkoutRoutes);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

app.use((error, req, res, next) => {
  // Log error with full details
  logger.error({
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Don't expose internal errors to client
  const statusCode = error.status || error.statusCode || 500;
  const message = isDevelopment
    ? error.message
    : "Ocurrió un error. Volvé a intentarlo más tarde.";

  res.status(statusCode).json({
    message,
    ...(isDevelopment && { error: error.message, stack: error.stack }),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
  try {
    await connectDB();
    await seedProducts();

    app.listen(PORT, () => {
      logger.info(`Server running on port: ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (error) {
    logger.error(error, "Failed to start server");
    await disconnectDB();
    process.exit(1);
  }
};

startServer();
