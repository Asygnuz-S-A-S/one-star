"use client"

import { useMemo, useState } from "react"
import type { ProductWithRelations } from "@/types/shop"
import ProductGallery from "./ProductGallery"
import ProductInfo from "./ProductInfo"
import { filterImagesByColor } from "@/lib/product-image"

interface ProductDetailProps {
  product: ProductWithRelations
  reviewStats?: { avg: number; count: number; distribution: number[] }
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
export default function ProductDetail({ product, reviewStats, initialColor }: ProductDetailProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-[60%_40%] gap-8 md:gap-12 mb-16">
      {/* key: al cambiar de color la galería vuelve a su primera foto */}
      <ProductGallery
        key={selectedColor}
        images={visibleImages}
        videoUrl={product.videoUrl}
      />
      <ProductInfo
        product={product}
        reviewStats={reviewStats}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
      />
    </div>
  )
}
