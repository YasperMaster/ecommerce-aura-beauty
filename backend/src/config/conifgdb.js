import mongoose from "mongoose";
import { seedProducts } from "./seedProducts.js";

// Cached across warm Vercel function invocations (and harmless locally too):
// avoids reconnecting to Atlas on every request once a connection exists.
let isConnected = false;
let connectionPromise = null;

export const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const dbUriTemplate = process.env.MONGO_DB_URI;

  if (!dbUriTemplate) {
    throw new Error("MONGO_DB_URI is not configured");
  }

  const dbURI = dbUriTemplate
    .replace("<db_username>", encodeURIComponent(process.env.MONGO_DB_USER || ""))
    .replace("<db_password>", encodeURIComponent(process.env.MONGO_DB_PASSWORD || ""))
    .replace("<db_name>", process.env.MONGO_DB_NAME || "");

  await mongoose.connect(dbURI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    // Vercel functions can run many concurrent invocations per warm
    // instance; keep the pool small since each instance opens its own.
    maxPoolSize: 5,
  });

  isConnected = true;
  console.log("Connected to MongoDB");

  await seedProducts();
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    isConnected = false;
    connectionPromise = null;
    console.log("Database disconnected");
  } catch (error) {
    console.log("Error disconnecting database:", error);
  }
};

/**
 * Returns a promise that resolves once the database is connected. Safe to
 * call from many places concurrently — every caller shares the same
 * in-flight attempt instead of racing to connect independently. If it
 * fails, the cached promise is cleared so the next caller gets a fresh
 * attempt instead of being permanently stuck.
 */
export const ensureConnected = () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return Promise.resolve();
  }

  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }

  return connectionPromise;
};

/**
 * Express middleware for routes that need the database. Explicitly waits
 * for the connection instead of silently relying on Mongoose's internal
 * query buffering — this is what closes the cold-start race where a
 * request lands right after the server starts listening but before the
 * database has actually finished connecting.
 */
export const requireDb = async (req, res, next) => {
  try {
    await ensureConnected();
    next();
  } catch (error) {
    res.status(503).json({
      message:
        "Base de datos no disponible temporalmente. Intentá de nuevo en unos segundos.",
    });
  }
};