import { z } from "zod"

export const productQuerySchema = z.object({
  category: z.string().min(1).optional(),
  take: z.coerce.number().int().positive().max(100).optional().default(20),
  skip: z.coerce.number().int().nonnegative().optional().default(0),
})

export type ProductQuery = z.infer<typeof productQuerySchema>

const variantSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido."),
  size: z.string().min(1, "La talla es requerida."),
  color: z.string().min(1, "El color es requerido."),
  stock: z.coerce.number().int().nonnegative().default(0),
  sizeUS: z.string().optional().nullable(),
  sizeCM: z.string().optional().nullable(),
  sizeEUR: z.string().optional().nullable(),
})

const imageSchema = z.object({
  url: z.string().url("URL de imagen inválida."),
  alt: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const productFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  slug: z.string().optional(),
  brand: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  categoryId: z.string().min(1, "La categoría es requerida."),
  description: z.string().optional().nullable(),
  extendedDescription: z.string().optional().nullable(),
  videoUrl: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().url("URL de video inválida.").optional().nullable()
  ),
  basePrice: z.coerce
    .number({ message: "El precio base debe ser un número." })
    .nonnegative("El precio base no puede ser negativo."),
  isOnSale: z.boolean().default(false),
  salePrice: z.coerce.number().nonnegative().optional().nullable(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  variants: z.array(variantSchema).default([]),
  images: z.array(imageSchema).default([]),
  crossSellIds: z.array(z.string()).default([]),
}).refine(
  (data) => !data.isOnSale || (data.salePrice !== null && data.salePrice !== undefined),
  { message: "El precio de oferta es requerido cuando el producto está en sale.", path: ["salePrice"] }
)

export type ProductFormData = z.infer<typeof productFormSchema>
