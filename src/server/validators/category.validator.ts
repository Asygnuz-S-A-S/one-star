import "server-only"

import { z } from "zod"

const slugSchema = z
  .string()
  .trim()
  .min(1, "El slug es obligatorio")
  .max(120, "El slug es demasiado largo")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo puede contener minúsculas, números y guiones")

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120, "El nombre es demasiado largo"),
  slug: slugSchema,
})

export const categoryIdSchema = z.string().trim().min(1, "La categoría es obligatoria")
