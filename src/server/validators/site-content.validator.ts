import { z } from "zod"

export const storePromiseIconSchema = z.enum(["truck", "clock", "return", "shield", "chat"])

export const storePromiseItemSchema = z.object({
  id: z.string().min(1),
  icon: storePromiseIconSchema,
  title: z.string().trim().min(1, "El título de la promesa es requerido").max(100),
  text: z.string().trim().min(1, "El texto de la promesa es requerido").max(300),
})

export const siteFaqItemSchema = z.object({
  q: z.string().trim().min(1, "La pregunta es requerida").max(200),
  a: z.string().trim().min(1, "La respuesta es requerida").max(1000),
})

export const updateSiteContentSchema = z.object({
  highlights: z.array(z.string().trim().max(200)).max(20).default([]),
  faqs: z.array(siteFaqItemSchema).max(20).default([]),
  promises: z.array(storePromiseItemSchema).max(10).optional().nullable(),
  returnWindowDays: z.coerce.number().int().min(1, "Mínimo 1 día").max(365, "Máximo 365 días").default(30),
})

export type UpdateSiteContentInput = z.infer<typeof updateSiteContentSchema>
