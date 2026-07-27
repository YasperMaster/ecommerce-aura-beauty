// Validates all required environment variables at startup
// Prevents silent failures in production

export const validateEnvironment = () => {
  const requiredVars = {
    JWT_SECRET: {
      required: true,
      message: "JWT_SECRET must be at least 32 characters",
      validate: (val) => val && val.length >= 32,
    },
    MONGO_DB_URI: {
      required: true,
      message: "MONGO_DB_URI is required for database connection",
    },
    MONGO_DB_USER: {
      required: true,
      message: "MONGO_DB_USER is required",
    },
    MONGO_DB_PASSWORD: {
      required: true,
      message: "MONGO_DB_PASSWORD is required",
    },
    MONGO_DB_NAME: {
      required: true,
      message: "MONGO_DB_NAME is required",
    },
    MERCADO_PAGO_ACCESS_TOKEN: {
      required: true,
      message: "MERCADO_PAGO_ACCESS_TOKEN is required for payment processing",
    },
    FRONTEND_URL: {
      required: true,
      message: "FRONTEND_URL is required for CORS configuration",
    },
  };

  // In production, webhook secret is mandatory
  if (process.env.NODE_ENV === "production") {
    requiredVars.MERCADOPAGO_WEBHOOK_SECRET = {
      required: true,
      message:
        "MERCADOPAGO_WEBHOOK_SECRET is required in production for webhook verification",
    };
  }

  const errors = [];

  for (const [key, config] of Object.entries(requiredVars)) {
    const value = process.env[key];

    if (!value) {
      errors.push(`Missing: ${config.message}`);
      continue;
    }

    if (config.validate && !config.validate(value)) {
      errors.push(`Invalid: ${config.message}`);
    }
  }

  if (errors.length > 0) {
    console.error("\n ENVIRONMENT VALIDATION FAILED:\n");
    errors.forEach((error) => console.error(error));
    console.error("\n Required variables:");
    Object.entries(requiredVars).forEach(([key, config]) => {
      console.error(`   - ${key}: ${config.message}`);
    });
    process.exit(1);
  }

  console.log("Environment variables validated successfully");
};
