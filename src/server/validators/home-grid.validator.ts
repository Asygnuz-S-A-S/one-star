import { z } from "zod"

export const HomeGridBlockSchema = z.object({
  label: z.string().min(1, "El texto es requerido"),
  href: z.string().min(1, "El enlace es requerido"),
  bgColor: z.string().min(1, "El color de fondo es requerido"),
  emoji: z.string().optional().nullable(),
  darkText: z.boolean().default(false),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export type HomeGridBlockInput = z.infer<typeof HomeGridBlockSchema>
