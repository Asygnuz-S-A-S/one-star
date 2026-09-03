import "server-only"
import { z } from "zod"
import { isSafePublicUrl } from "@/lib/safe-url"

function isValidDateValue(value: string): boolean {
  if (value === "") return true
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!dateOnly) return !Number.isNaN(Date.parse(value))

  const [, year, month, day] = dateOnly
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return parsed.getUTCFullYear() === Number(year)
    && parsed.getUTCMonth() === Number(month) - 1
    && parsed.getUTCDate() === Number(day)
}

const OptionalDateSchema = z.string().trim().refine(
  isValidDateValue,
  "Fecha inválida"
).nullable().optional()

export const BannerInputSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(160),
  imageUrl: z.string().trim().min(1, "La imagen o video es obligatorio").max(2_000)
    .refine(isSafePublicUrl, "Usa una ruta interna o una URL http/https"),
  mediaType: z.enum(["image", "video"]).default("image"),
  linkUrl: z.string().trim().max(500).nullable().optional()
    .refine(value => !value || isSafePublicUrl(value), "Usa una ruta interna o una URL http/https"),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  startDate: OptionalDateSchema,
  endDate: OptionalDateSchema,
}).refine(
  data => !data.startDate || !data.endDate || Date.parse(data.startDate) <= Date.parse(data.endDate),
  { message: "La fecha final debe ser posterior o igual a la inicial", path: ["endDate"] }
)

export type BannerInput = z.input<typeof BannerInputSchema>
