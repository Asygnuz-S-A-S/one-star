import { z } from "zod"
import { COLOR_SEPARATOR } from "@/lib/colors"

export const productColorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del color es requerido.")
    .max(40, "El nombre no puede superar 40 caracteres.")
    .refine(
      (v) => !v.includes(COLOR_SEPARATOR),
      `El nombre no puede contener "${COLOR_SEPARATOR}": ese símbolo se reserva para combinaciones (ej. "Rojo${COLOR_SEPARATOR}Negro").`
    ),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "El tono debe ser un color hexadecimal (ej. #1C1C1C)."),
  isActive: z.coerce.boolean().default(true),
})

export type ProductColorInput = z.infer<typeof productColorSchema>
