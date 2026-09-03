import "server-only"
import { z } from "zod"
import { isSafePublicUrl } from "@/lib/safe-url"

export const HomeGridBlockSchema = z.object({
  label: z.string().trim().min(1, "El texto es requerido"),
  href: z.string().trim().min(1, "El enlace es requerido")
    .refine(isSafePublicUrl, "Usa una ruta interna o una URL http/https"),
  bgColor: z.string().trim().min(1, "El color de fondo es requerido"),
  emoji: z.string().optional().nullable(),
  darkText: z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
})

export type HomeGridBlockInput = z.infer<typeof HomeGridBlockSchema>
