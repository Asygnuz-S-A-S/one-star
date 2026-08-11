import "server-only"
import { z } from "zod"
import { isSafePublicUrl } from "@/lib/safe-url"

export const TopBannerMessageSchema = z.object({
  text: z.string().trim().min(1, "El mensaje no puede estar vacío").max(200),
  url: z.string().trim().max(500).optional()
    .refine(value => !value || isSafePublicUrl(value), "Usa una ruta interna o una URL http/https"),
})

export const TopBannerInputSchema = z.object({
  text: z.string().trim().max(200),
  btnText: z.string().trim().max(80).nullable().optional(),
  btnUrl: z.string().trim().max(500).nullable().optional()
    .refine(value => !value || isSafePublicUrl(value), "Usa una ruta interna o una URL http/https"),
  messages: z.array(TopBannerMessageSchema).max(20).default([]),
  bgColor: z.string().trim().min(1).max(32),
  textColor: z.string().trim().min(1).max(32),
  isActive: z.boolean(),
}).refine(
  data => !data.isActive || data.text.length > 0 || data.messages.length > 0,
  { message: "Agrega al menos un mensaje promocional", path: ["messages"] }
)

export type TopBannerInput = z.input<typeof TopBannerInputSchema>
