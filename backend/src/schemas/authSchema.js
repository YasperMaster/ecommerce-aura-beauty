import { z } from "zod"

export const registerSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.email().max(254),
    password: z.string().min(6).max(30),
})

export const loginSchema = z.object({
    email: z.email().max(254),
    password: z.string().min(6).max(30),
})