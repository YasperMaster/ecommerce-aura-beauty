import mongoose from "mongoose";
import { seedProducts } from "./seedProducts.js";

// Cached across warm Vercel function invocations (and harmless locally too):
// avoids reconnecting to Atlas on every request once a connection exists.
let isConnected = false;

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
    console.log("Database disconnected");
  } catch (error) {
    console.log("Error disconnecting database:", error);
  }
};
