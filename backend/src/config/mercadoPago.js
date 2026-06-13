import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

// ---------------------------------------------------------------------------
// Token mode detection
// Official docs: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/credentials
//   TEST-*     → sandbox / test credentials
//   APP_USR-*  → production credentials
// ---------------------------------------------------------------------------
export const isTestToken = (token = "") => token.startsWith("TEST-");

export const getAccessToken = () => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
  }

  return token;
};

// Singleton — lazily initialized, invalidated when the token changes
let cachedToken = null;
let mercadoPagoClients = null;

export const getMercadoPagoClients = () => {
  const token = getAccessToken();

  // Reset cache if token has changed (e.g. after hot-reload in dev)
  if (token !== cachedToken) {
    cachedToken = token;
    mercadoPagoClients = null;
  }

  if (!mercadoPagoClients) {
    const client = new MercadoPagoConfig({
      accessToken: token,
      options: { timeout: 8000 },
    });

    mercadoPagoClients = {
      preference: new Preference(client),
      payment: new Payment(client),
    };
  }

  return mercadoPagoClients;
};
