import { z } from "zod"

export const createCheckoutPreferenceSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string().trim().min(1),
            quantity: z.number().int().min(1).max(10),
        }),
    ).min(1),
})
