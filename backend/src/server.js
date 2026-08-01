import "./loadEnv.js"; // must run before app.js is imported (loads .env for local dev)
import app, { allowedOrigins } from "./app.js";
import { connectDB, disconnectDB } from "./config/conifgdb.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT) || 3001;

// ============================================================================
// SERVER STARTUP (local dev / Docker / Kubernetes only — NOT used on Vercel)
// ============================================================================
// On Vercel, backend/api/index.js is the entry point instead: it imports the
// same `app` and calls connectDB() per-invocation instead of app.listen().

const startServer = async () => {
  try {
    await connectDB(); // also seeds default products on first successful connection

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
