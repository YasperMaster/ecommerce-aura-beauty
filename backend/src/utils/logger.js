import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

export const createLogger = (module) => logger.child({ module });

export const sanitizeForLog = (obj) => {
  if (!obj) return obj;

  const sanitized = { ...obj };
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "accessToken",
    "refreshToken",
    "MERCADO_PAGO_ACCESS_TOKEN",
    "JWT_SECRET",
    "MERCADOPAGO_WEBHOOK_SECRET",
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
};

export const formatErrorResponse = (error, isDevelopment = false) => {
  if (isDevelopment) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: "Ocurrió un error. Volvé a intentarlo más tarde.",
  };
};
