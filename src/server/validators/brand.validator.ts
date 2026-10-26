import { z } from "zod"
import { canUseNextImageOptimization } from "@/lib/image-optimization"

const optionalImageUrlSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val) return true
      return canUseNextImageOptimization(val)
    },
    {
      message:
        "La URL de la imagen debe provenir de un dominio permitido (Cloudinary, Unsplash, Nike, Scene7) o ser una ruta interna.",
    }
  )

export const brandFaqItemSchema = z.object({
  q: z.string().trim().min(1, "La pregunta es requerida").max(200),
  a: z.string().trim().min(1, "La respuesta es requerida").max(1000),
})

export const brandInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(100),
  slug: z.string().trim().min(1).max(100).optional(),
  logoUrl: optionalImageUrlSchema,
  bannerUrl: optionalImageUrlSchema,
  sizeGuideImageUrl: optionalImageUrlSchema,
  sizeGuideMenUrl: optionalImageUrlSchema,
  sizeGuideWomenUrl: optionalImageUrlSchema,
  sizeGuideKidsUrl: optionalImageUrlSchema,
  sizeGuideNote: z.string().trim().max(500).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  story: z.string().trim().max(5000).optional().nullable(),
  metaTitle: z.string().trim().max(120).optional().nullable(),
  metaDescription: z.string().trim().max(300).optional().nullable(),
  highlights: z.array(z.string().trim().max(200)).max(20).default([]),
  faqs: z.array(brandFaqItemSchema).max(20).default([]),
  isActive: z.boolean().default(true),
})

export type BrandInput = z.infer<typeof brandInputSchema>
