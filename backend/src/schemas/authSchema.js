import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(20),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(30),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(30),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z
    .string()
    .trim()
    .length(6, "El código debe tener 6 dígitos.")
    .regex(/^\d{6}$/, "El código debe contener solo números."),
});

export const resendCodeSchema = z.object({
  email: z.string().trim().email().max(254),
});
