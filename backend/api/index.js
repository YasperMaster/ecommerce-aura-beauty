// Vercel serverless entry point for the Express backend.
// No app.listen() here — Vercel calls this handler per request.
import app from "../src/app.js";
import { connectDB } from "../src/config/conifgdb.js";

// Cache the connection promise on the module scope so it survives across
// warm invocations of the same function instance. If it fails, reset it so
// the next request gets a fresh attempt instead of being stuck forever.
let dbReady = null;

const ensureDB = async () => {
  if (!dbReady) {
    dbReady = connectDB().catch((error) => {
      dbReady = null;
      throw error;
    });
  }
  return dbReady;
};

export default async function handler(req, res) {
  try {
    await ensureDB();
  } catch (error) {
    res.status(503).json({ message: "Database connection failed" });
    return;
  }
  return app(req, res);
}
