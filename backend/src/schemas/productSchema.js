import { z } from "zod";

const imageValueSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^https?:\/\/.+/i.test(value) ||
      /^data:image\/[a-zA-Z+.-]+;base64,/.test(value),
    { message: "La imagen debe ser una URL válida o una imagen subida." },
  );

export const productSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1200),
  longDescription: z.string().trim().max(4000).optional().default(""),
  category: z.string().trim().max(60).default(""),
  image: imageValueSchema,
  images: z.array(imageValueSchema).max(8).optional().default([]),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  isActive: z.coerce.boolean().default(true),
});
