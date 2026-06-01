import type { Category, Product, ProductImage, Variant } from "@prisma/client"
import type { Decimal } from "@prisma/client/runtime/library"

// Gender enum — defined in schema but may not yet be in generated client
export type Gender = "UNISEX" | "HOMBRE" | "MUJER" | "NINO" | "NINA" | "INFANTIL" | "BEBE"

// Extended product fields not yet reflected in the generated client
// (will resolve once `prisma generate` is run after schema changes)
export interface ProductExtended extends Product {
  brand: string | null
  gender: Gender | null
  metaTitle: string | null
  metaDescription: string | null
  extendedDescription: string | null
  videoUrl: string | null
}

export interface VariantExtended extends Variant {
  sizeUS: string | null
  sizeCM: string | null
  sizeEUR: string | null
}

export interface CrossSellProduct {
  id: string
  name: string
  slug: string
  brand: string | null
  basePrice: Decimal
}

export interface ProductWithRelations extends ProductExtended {
  category: Category
  images: ProductImage[]
  variants: VariantExtended[]
  crossSells: CrossSellProduct[]
}

export interface ActionResult {
  success: boolean
  id?: string
  error?: string
}

export type { Category, ProductImage, Variant }
