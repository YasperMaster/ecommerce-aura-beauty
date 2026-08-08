import "./loadEnv.js"; // must run before app.js is imported (loads .env for local dev)
import app, { allowedOrigins } from "./app.js";
import { ensureConnected } from "./config/conifgdb.js";
import { logger } from "./utils/logger.js";

const PORT = Number(process.env.PORT) || 3001;

// ============================================================================
// SERVER STARTUP
// ============================================================================
// This file is the entry point everywhere: local dev, Docker, Kubernetes,
// AND Vercel (vercel.json's backend service "entrypoint" points here —
// Vercel's Node runtime detects the app.listen() call below and hosts this
// as a long-lived Vercel Function).
//
// The HTTP server starts listening immediately, independent of database
// status — a DB hiccup must never take the whole process down, since it's
// long-lived and reused across many requests, not spun up fresh per-request.
// DB-dependent routes use the requireDb middleware (see app.js) to
// explicitly wait for ensureConnected() themselves, which closes the
// cold-start race where a request could otherwise land before the
// connection kicked off here has actually finished.

app.listen(PORT, () => {
  logger.info(`Server running on port: ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
});

ensureConnected()
  .then(() => logger.info("Connected to MongoDB"))
  .catch((error) =>
    logger.error(
      { error: error.message },
      "Initial MongoDB connection failed — requests needing the database " +
        "will retry the connection themselves via the requireDb middleware.",
    ),
  );