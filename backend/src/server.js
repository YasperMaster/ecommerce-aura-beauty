import "./loadEnv.js"; // must run before app.js is imported (loads .env for local dev)
import app, { allowedOrigins } from "./app.js";
import { connectDB } from "./config/conifgdb.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT) || 3001;

const connectWithRetry = async (attempt = 1) => {
  const MAX_ATTEMPTS = 5;
  const BASE_DELAY_MS = 2000;

  try {
    await connectDB();
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error({ error: error.message, attempt }, "Failed to connect to MongoDB");

    if (attempt < MAX_ATTEMPTS) {
      const delay = BASE_DELAY_MS * attempt;
      setTimeout(() => connectWithRetry(attempt + 1), delay);
    } else {
      logger.error(
        "Giving up on MongoDB connection after max attempts — the server " +
          "will keep running, but any request that needs the database will " +
          "keep failing until this is fixed and the process is restarted.",
      );
    }
  }
};

app.listen(PORT, () => {
  logger.info(`Server running on port: ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
});

connectWithRetry();