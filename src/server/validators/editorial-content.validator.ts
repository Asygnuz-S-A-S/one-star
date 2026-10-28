import "server-only"

import { z } from "zod"
import { isSafePublicUrl } from "@/lib/safe-url"

const AppearanceSchema = z.enum(["light", "carbon", "oneStarRed"])
const DestinationSchema = z.string().trim().min(1, "Selecciona un destino")
  .max(500)
  .refine(isSafePublicUrl, "Usa una ruta interna o una URL http/https")
const CtaSchema = z.object({
  label: z.string().trim().min(1, "El texto del CTA es obligatorio").max(60),
  href: DestinationSchema,
})
const MediaSchema = z.object({
  src: DestinationSchema,
  alt: z.string().trim().min(1, "El texto alternativo es obligatorio").max(180),
})

const CampaignSlideSchema = z.object({
  id: z.string().trim().min(1, "El identificador del slide es obligatorio").max(100),
  eyebrow: z.string().trim().max(60).optional(),
  headline: z.string().trim().min(1, "El titular es obligatorio").max(120),
  copy: z.string().trim().max(320).optional(),
  accent: AppearanceSchema,
  primaryCta: CtaSchema,
  secondaryCta: CtaSchema.optional(),
  desktopMedia: MediaSchema.optional(),
  tabletMedia: MediaSchema.optional(),
  mobileMedia: MediaSchema.optional(),
  foregroundMedia: MediaSchema.optional(),
})

const CampaignHeroSchema = z.object({
  version: z.literal(1),
  kind: z.literal("campaignHero"),
  eyebrow: z.string().trim().max(60).optional(),
  headline: z.string().trim().min(1, "El titular es obligatorio").max(120).optional(),
  copy: z.string().trim().max(320).optional(),
  accent: AppearanceSchema.optional(),
  primaryCta: CtaSchema.optional(),
  secondaryCta: CtaSchema.optional(),
  desktopMedia: MediaSchema.optional(),
  tabletMedia: MediaSchema.optional(),
  mobileMedia: MediaSchema.optional(),
  foregroundMedia: MediaSchema.optional(),
  slides: z.array(CampaignSlideSchema).min(1, "Añade al menos un slide").max(8, "Máximo 8 slides").optional(),
}).superRefine((campaign, context) => {
  if (campaign.slides?.length) return
  if (!campaign.headline) context.addIssue({ code: "custom", path: ["headline"], message: "El titular es obligatorio" })
  if (!campaign.accent) context.addIssue({ code: "custom", path: ["accent"], message: "Selecciona una apariencia" })
  if (!campaign.primaryCta) context.addIssue({ code: "custom", path: ["primaryCta"], message: "El CTA principal es obligatorio" })
})

const CollectionTileSchema = z.object({
  version: z.literal(1),
  kind: z.literal("collectionTile"),
  tiles: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(80).optional(),
    href: DestinationSchema.optional(),
    appearance: AppearanceSchema,
    media: MediaSchema.optional(),
  })).min(1).max(8),
})

const EditorialBlockSchema = z.object({
  version: z.literal(1),
  kind: z.literal("editorialBlock"),
  title: z.string().trim().min(1, "El título es obligatorio").max(120),
  body: z.string().trim().max(600).optional(),
  appearance: AppearanceSchema,
  cta: CtaSchema.optional(),
  media: MediaSchema.optional(),
})

/** Validates only v1 semantic content; legacy JSON keeps its original contract. */
export const EditorialContentConfigSchema = z.discriminatedUnion("kind", [
  CampaignHeroSchema,
  CollectionTileSchema,
  EditorialBlockSchema,
])

export function isEditorialContentConfig(value: unknown): boolean {
  return typeof value === "object" && value !== null
    && (value as Record<string, unknown>).version === 1
    && typeof (value as Record<string, unknown>).kind === "string"
}
