import "server-only"

import { z } from "zod"
import { EMAIL_KEYS } from "@/server/email/catalog"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((value) => value || null)
    .nullable()
    .optional()
    .transform((value) => value ?? null)

export const emailTemplateUpdateSchema = z.object({
  key: z.enum(EMAIL_KEYS),
  subject: optionalText(150),
  intro: optionalText(1000),
  enabled: z.boolean(),
})

export const emailTestSchema = z.object({
  key: z.enum(EMAIL_KEYS),
  to: z.string().trim().toLowerCase().email("Correo inválido."),
})

export type EmailTemplateUpdateInput = z.infer<typeof emailTemplateUpdateSchema>

export const emailPreviewSchema = z.object({
  key: z.enum(EMAIL_KEYS),
  subject: z.string().max(150).optional(),
  intro: z.string().max(1000).optional(),
})
