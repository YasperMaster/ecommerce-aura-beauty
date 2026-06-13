import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import dotenv from "dotenv";
dotenv.config();

let mercadoPagoClients = null;

export const getMercadoPagoClients = () => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured");
  }

  if (!mercadoPagoClients) {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      options: {
        timeout: 5000,
      },
    });

    mercadoPagoClients = {
      preference: new Preference(client),
      payment: new Payment(client),
    };
  }

  return mercadoPagoClients;
};
