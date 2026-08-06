import type { Category, Product, ProductImage, Variant, Brand } from "@prisma/client"
import type { Decimal } from "@prisma/client/runtime/library"

// Gender enum — defined in schema but may not yet be in generated client
export type Gender = "UNISEX" | "HOMBRE" | "MUJER" | "NINO" | "NINA" | "INFANTIL" | "BEBE"

// Extended product fields not yet reflected in the generated client
// (will resolve once `prisma generate` is run after schema changes)
export interface ProductExtended extends Product {
  gender: Gender | null
  metaTitle: string | null
  metaDescription: string | null
  extendedDescription: string | null
  videoUrl: string | null
  availableOnline: boolean
  availableInStores: boolean
}

export interface VariantExtended extends Variant {
  sizeUS: string | null
  sizeCM: string | null
  sizeEUR: string | null
  inventory: Array<{
    id: string
    storeLocationId: string | null
    stock: number
    storeLocation?: { id: string; name: string } | null
  }>
}

export interface CrossSellProduct {
  id: string
  name: string
  slug: string
  brandId: string | null
  brand: { name: string } | null
  basePrice: Decimal
}

export interface ColorFamilyProduct {
  id: string
  name: string
  slug: string
  brandId: string | null
  brand: { name: string } | null
  images: ProductImage[]
  variants: Variant[]
}

export interface ProductWithRelations extends ProductExtended {
  category: Category
  brand: Brand | null
  images: ProductImage[]
  variants: VariantExtended[]
  colorFamily: { id: string; products: ColorFamilyProduct[] } | null
  crossSells: CrossSellProduct[]
}

export interface ActionResult {
  success: boolean
  id?: string
  error?: string
}

export type { Category, ProductImage, Variant }
