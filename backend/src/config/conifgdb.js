import mongoose from "mongoose";

export const connectDB = async () => {
  const dbUriTemplate = process.env.MONGO_DB_URI;

  if (!dbUriTemplate) {
    throw new Error("MONGO_DB_URI is not configured");
  }

  const dbURI = dbUriTemplate
    .replace(
      "<db_username>",
      encodeURIComponent(process.env.MONGO_DB_USER || ""),
    )
    .replace(
      "<db_password>",
      encodeURIComponent(process.env.MONGO_DB_PASSWORD || ""),
    )
    .replace("<db_name>", process.env.MONGO_DB_NAME || "");

  await mongoose.connect(dbURI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  console.log("Connected to MongoDB");
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log("Database disconnected");
  } catch (error) {
    console.log("Error disconnecting database:", error);
  }
};
