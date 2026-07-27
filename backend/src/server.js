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
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";

// Load environment variables
dotenv.config({
  path: new URL("../.env", import.meta.url),
});

// Validate environment before starting
validateEnvironment();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const isDevelopment = process.env.NODE_ENV !== "production";

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// 1. Helmet: Add security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", process.env.MERCADO_PAGO_API || ""],
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
// Remove $ and . from keys in request body, params, query
app.use(
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      logger.warn({ key }, "Sanitized potentially malicious input");
    },
  }),
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================================================
// API ROUTES (V1)
// ============================================================================

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/checkout", checkoutRoutes);

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
    : "An error occurred. Please try again later.";

  res.status(statusCode).json({
    message,
    ...(isDevelopment && { error: error.message, stack: error.stack }),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
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
