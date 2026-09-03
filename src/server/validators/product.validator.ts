import "server-only"

import { z } from "zod"

export const productQuerySchema = z.object({
  category: z.string().min(1).optional(),
  take: z.coerce.number().int().positive().max(100).optional().default(20),
  skip: z.coerce.number().int().nonnegative().optional().default(0),
})

export type ProductQuery = z.infer<typeof productQuerySchema>

export const bulkProductPublishStatusSchema = z.object({
  ids: z
    .array(
      z.string()
        .trim()
        .min(1, "El identificador del producto es obligatorio.")
        .pipe(z.cuid("El identificador del producto no es válido."))
    )
    .min(1, "Selecciona al menos un producto.")
    .max(100, "No puedes actualizar más de 100 productos a la vez.")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "La selección contiene productos duplicados."
    ),
  isPublished: z.boolean(),
})

const optionalCuidQueryString = z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.cuid().optional().catch(undefined)
)

const adminProductFiltersSchema = z.object({
  page: z.preprocess(
    (value) => typeof value === "string" ? Number.parseInt(value, 10) : value,
    z.number().int().positive().catch(1)
  ),
  q: z.preprocess(
    (value) => typeof value === "string" ? value.trim() : "",
    z.string().default("")
  ),
  category: optionalCuidQueryString,
  brand: optionalCuidQueryString,
  status: z.preprocess(
    (value) => typeof value === "string" ? value : undefined,
    z.enum(["active", "inactive"]).optional().catch(undefined)
  ),
  hasStock: z.preprocess(
    (value) => typeof value === "string" ? value : undefined,
    z.enum(["yes", "no"]).optional().catch(undefined)
  ),
})

export function parseAdminProductFilters(
  input: Record<string, string | string[] | undefined>
) {
  const parsed = adminProductFiltersSchema.parse(input)
  return {
    page: parsed.page,
    q: parsed.q,
    categoryId: parsed.category,
    brandId: parsed.brand,
    status: parsed.status,
    hasStock: parsed.hasStock,
  }
}

const variantSchema = z.object({
  sku: z.string().min(1, "El SKU es requerido."),
  size: z.string().min(1, "La talla es requerida."),
  // El color es opcional: las variantes que llegan del ERP entran sin color y
  // el admin lo asigna después desde el formulario ("Sin asignar" = "").
  color: z.string().default(""),
  stock: z.coerce.number().int().nonnegative().default(0),
  inventory: z.array(z.object({
    storeLocationId: z.string().nullable(),
    stock: z.coerce.number().int().nonnegative().default(0),
  })).default([]),
  sizeUS: z.string().optional().nullable(),
  sizeCM: z.string().optional().nullable(),
  sizeEUR: z.string().optional().nullable(),
})

const imageSchema = z.object({
  url: z.string().url("URL de imagen inválida."),
  alt: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
  // Color de variante al que pertenece la foto. null/"" = imagen general del producto.
  color: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().optional().nullable()
  ),
})

export const productFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido."),
  slug: z.string().optional(),
  brandId: z.string().optional().nullable(),
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
  availableOnline: z.boolean().default(true),
  availableInStores: z.boolean().default(true),
  isPublished: z.boolean().default(true),
  variants: z.array(variantSchema).default([]),
  images: z.array(imageSchema).default([]),
  colorFamilyProductIds: z.array(z.string().min(1)).optional(),
  colorFamilyBaselineProductIds: z.array(z.string().min(1)).optional(),
  crossSellIds: z.array(z.string()).default([]),
}).refine(
  (data) => !data.isOnSale || (data.salePrice !== null && data.salePrice !== undefined),
  { message: "El precio de oferta es requerido cuando el producto está en sale.", path: ["salePrice"] }
)

export type ProductFormData = z.infer<typeof productFormSchema>
