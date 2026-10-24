"use client"

import { useMemo, useState } from "react"
import type { ProductWithRelations } from "@/types/shop"
import ProductGallery from "./ProductGallery"
import ProductInfo from "./ProductInfo"
import { filterImagesByColor } from "@/lib/product-image"
import type { StorePromise } from "@/lib/store-promises"

interface ProductDetailProps {
  product: ProductWithRelations
  reviewStats?: { avg: number; count: number; distribution: number[] }
  promises?: StorePromise[]
  whatsappUrl?: string | null
  brand?: { name?: string | null; sizeGuideImageUrl?: string | null; sizeGuideNote?: string | null } | null
  /**
   * Color con el que abrir la ficha, tomado de `?color=` en la URL. Permite
   * que una miniatura del catálogo lleve directo a ese color. Si no coincide
   * con ninguna variante se ignora y se usa el primero.
   */
  initialColor?: string
}

/**
 * Une galería e información porque comparten el color seleccionado:
 * al cambiar de color, la galería pasa a mostrar las fotos de ese color.
 */
export default function ProductDetail({ product, reviewStats, promises, whatsappUrl, brand, initialColor }: ProductDetailProps) {
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    const match = product.variants.find(
      (variant) => variant.color?.toLowerCase() === initialColor?.trim().toLowerCase()
    )
    return match?.color ?? product.variants[0]?.color ?? ""
  })

  const visibleImages = useMemo(
    () => filterImagesByColor(product.images, selectedColor),
    [product.images, selectedColor]
  )

  return (
    // minmax(0, …): con porcentajes + gap las columnas sumaban más del 100 % y aparecía scroll horizontal.
    <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
      {/* key: al cambiar de color la galería vuelve a su primera foto */}
      <ProductGallery
        key={selectedColor}
        images={visibleImages}
        videoUrl={product.videoUrl}
      />
      <ProductInfo
        product={product}
        reviewStats={reviewStats}
        promises={promises}
        whatsappUrl={whatsappUrl}
        brand={brand}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
      />
    </div>
  )
}
