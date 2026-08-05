import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(20),
  email: z.string().trim().email().max(254),
  password: z.string().min(6).max(30),
  phone: z
    .string()
    .trim()
    .min(8, "El número de teléfono es demasiado corto.")
    .max(20, "El número de teléfono es demasiado largo.")
    .regex(
      /^[\d\s-()]+$/,
      "Ingresá un número de teléfono válido (solo dígitos, espacios, guiones y paréntesis).",
    )
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15;
      },
      { message: "El teléfono debe tener entre 8 y 15 dígitos." },
    ),
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

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z
    .string()
    .trim()
    .length(6, "El código debe tener 6 dígitos.")
    .regex(/^\d{6}$/, "El código debe contener solo números."),
  newPassword: z.string().min(6).max(30),
});

export const updatePhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(8, "El número de teléfono es demasiado corto.")
    .max(20, "El número de teléfono es demasiado largo.")
    .regex(
      /^[\d\s-()]+$/,
      "Ingresá un número de teléfono válido (solo dígitos, espacios, guiones y paréntesis).",
    )
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15;
      },
      { message: "El teléfono debe tener entre 8 y 15 dígitos." },
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Ingresá tu contraseña actual."),
  newPassword: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .max(30, "La contraseña debe tener a lo sumo 30 caracteres."),
});
