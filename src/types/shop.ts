export interface ProductImage {
  id: string
  url: string
  alt: string
  position: number
  /** Color de variante al que pertenece la foto. null = imagen general. */
  color?: string | null
}

export interface Variant {
  id: string
  sku: string
  size: string
  color: string
  stock: number
  inventory?: {
    id: string
    storeLocationId: string | null
    storeName: string | null
    stock: number
  }[]
  sizeUS: string | null
  sizeCM: string | null
  sizeEUR: string | null
}

export interface CrossSellProduct {
  isNew?: boolean
  hasStock?: boolean
  id: string
  slug: string
  name: string
  brand: string | null
  brandId?: string | null
  basePrice: number
  isOnSale: boolean
  salePrice: number | null
  images: ProductImage[]
  variants: Variant[]
}

export interface ProductCategory {
  id: string
  name: string
  slug: string
}

export interface ProductWithRelations {
  id: string
  slug: string
  name: string
  brand: string | null
  basePrice: number
  isOnSale: boolean
  salePrice: number | null
  description: string | null
  extendedDescription: string | null
  videoUrl: string | null
  metaTitle: string | null
  metaDescription: string | null
  gender: string | null
  categoryId: string
  category: ProductCategory
  availableOnline?: boolean
  availableInStores?: boolean
  images: ProductImage[]
  variants: Variant[]
  crossSells: CrossSellProduct[]
}
