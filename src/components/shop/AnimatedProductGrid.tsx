"use client"

import ProductCard from "@/components/home/ProductCard"
import { buildProductFamilyCardColorSummary } from "@/lib/product-card-colors"
import type { ColorPalette } from "@/lib/colors"
import type { ProductDTO } from "@/server/services/product.service"

interface Props {
  products: ProductDTO[]
  /** Cambia cuando cambian los filtros para re-disparar la animación */
  animationKey: string
  colorPalette?: ColorPalette
}

export function AnimatedProductGrid({ products, animationKey, colorPalette }: Props) {
  return (
    <div
      key={animationKey}
      className="store-gutter grid grid-cols-2 gap-2 py-4 sm:gap-3 md:grid-cols-3 md:py-6 lg:grid-cols-4"
    >
      {products.map((product) => {
        const image = product.images[0]
        const secondaryImage = product.images[1]
        const gallery = product.images.slice(2).map((img) => img.url)
        const colorSummary = buildProductFamilyCardColorSummary([
          product,
          ...product.colorSiblings,
        ])
        return (
          <div
            key={product.id}
            className="h-full"
          >
            <ProductCard
              id={product.id}
              slug={product.slug}
              name={product.name}
              brand={product.brand ?? "One Star"}
              price={product.basePrice}
              salePrice={product.salePrice ?? undefined}
              imageUrl={image?.url}
              secondaryImageUrl={secondaryImage?.url}
              gallery={gallery}
              isOnSale={product.isOnSale}
              isNew={product.isNew}
              hasStock={product.hasStock}
              colorSummary={colorSummary}
              colorPalette={colorPalette}
            />
          </div>
        )
      })}
    </div>
  )
}
