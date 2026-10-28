import "server-only"
import { z } from "zod"

/**
 * Normaliza un número de teléfono de WhatsApp extrayendo únicamente los dígitos.
 */
export function normalizeWaPhone(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "")
}

/**
 * Extrae el slug limpio de producto si se envió una ruta (/productos/slug) o URL completa.
 */
export function extractProductSlug(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const parsedUrl = new URL(trimmed)
      const match = parsedUrl.pathname.match(/\/productos\/([^/?#]+)/i)
      if (match?.[1]) return match[1]
      return parsedUrl.pathname.replace(/^\/+|\/+$/g, "")
    }
  } catch {
    // Continúa con limpieza de ruta relativa
  }
  const withoutQuery = trimmed.split(/[?#]/)[0] ?? ""
  const match = withoutQuery.match(/(?:^|\/)productos\/([^/]+)/i)
  if (match?.[1]) return match[1]
  return withoutQuery.replace(/^\/+|\/+$/g, "")
}

export const waPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeWaPhone)
  .refine((val) => val.length >= 7 && val.length <= 15, {
    message: "El teléfono waPhone debe contener entre 7 y 15 dígitos",
  })

export const leadStageSchema = z.enum([
  "NUEVO",
  "INTERESADO",
  "CARRITO",
  "CHECKOUT",
  "COMPRO",
  "ABANDONO",
])

/**
 * Esquema para POST /api/assistant/leads
 * Nunca acepta ni persiste correo ni cédula desde el bot.
 */
export const assistantLeadUpsertSchema = z
  .object({
    waPhone: waPhoneSchema,
    name: z.string().trim().min(1).max(120).nullable().optional(),
    ctwaClid: z.string().trim().min(1).max(255).nullable().optional(),
    consent: z.boolean().optional(),
    consentimiento: z.boolean().optional(),
    optedOut: z.boolean().optional(),
    baja: z.boolean().optional(),
  })
  .transform((data) => ({
    waPhone: data.waPhone,
    name: data.name ?? undefined,
    ctwaClid: data.ctwaClid ?? undefined,
    consent: data.consent ?? data.consentimiento,
    optedOut: data.optedOut ?? data.baja,
  }))

export type AssistantLeadUpsertInput = z.infer<typeof assistantLeadUpsertSchema>

/**
 * Esquema para POST /api/assistant/leads/event
 * Descarta explícitamente claves sensibles (email, correo, cedula, documento) del metadata.
 */
export const assistantLeadEventSchema = z.object({
  waPhone: waPhoneSchema,
  type: z.string().trim().min(1, "El tipo de evento es requerido").max(80),
  stage: leadStageSchema.optional(),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .transform((meta) => {
      if (!meta) return undefined
      const cleaned: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(meta)) {
        if (/^(email|correo|cedula|document|documento|documentNumber)$/i.test(key)) {
          continue
        }
        cleaned[key] = value
      }
      return cleaned
    }),
})

export type AssistantLeadEventInput = z.infer<typeof assistantLeadEventSchema>

/**
 * Esquema para POST /api/assistant/leads/link
 */
export const assistantLeadLinkSchema = z
  .object({
    waPhone: waPhoneSchema,
    productSlug: z.string().trim().min(1).max(200).optional(),
    product: z.string().trim().min(1).max(200).optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    utmCampaign: z.string().trim().min(1).max(120).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => Boolean(data.productSlug || data.product || data.slug), {
    message: "El producto (productSlug, product o slug) es requerido",
    path: ["productSlug"],
  })
  .transform((data) => ({
    waPhone: data.waPhone,
    productSlug: extractProductSlug(data.productSlug || data.product || data.slug || ""),
    utmCampaign: data.utmCampaign,
    name: data.name,
  }))
  .refine((data) => data.productSlug.length > 0, {
    message: "El slug del producto no es válido",
    path: ["productSlug"],
  })

export type AssistantLeadLinkInput = z.infer<typeof assistantLeadLinkSchema>
