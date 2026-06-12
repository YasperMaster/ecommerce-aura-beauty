import { MercadoPagoConfig, Payment, Preference } from "mercadopago"

let mercadoPagoClients = null

export const getMercadoPagoClients = () => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (!accessToken) {
        throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured")
    }

    if (!mercadoPagoClients) {
        const client = new MercadoPagoConfig({
            accessToken,
            options: {
                timeout: 5000,
            },
        })

        mercadoPagoClients = {
            preference: new Preference(client),
            payment: new Payment(client),
        }
    }

    return mercadoPagoClients
}
