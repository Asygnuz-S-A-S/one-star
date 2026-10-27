"use client"

import ProductCard from "@/components/home/ProductCard"
import type { ProductCardColorSummary } from "@/lib/product-card-colors"

interface ProductItem {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  secondaryImageUrl?: string
  gallery?: string[]
  isNew?: boolean
  isOnSale?: boolean
  colorSummary?: ProductCardColorSummary
}

export default function FeaturedProductsGrid({ products }: { products: ProductItem[] }) {
  return (
    <div>
      {/* Mobile: horizontal scroll */}
      <div className="flex md:hidden gap-4 overflow-x-auto scrollbar-hide pb-4">
        {products.map((product) => (
          <div
            key={`mobile-${product.id}`}
            className="w-48 shrink-0"
          >
            <ProductCard
              id={product.id}
              slug={product.slug}
              name={product.name}
              brand={product.brand}
              price={product.price}
              salePrice={product.salePrice}
              imageUrl={product.imageUrl}
              secondaryImageUrl={product.secondaryImageUrl}
              gallery={product.gallery}
              isOnSale={product.isOnSale}
              colorSummary={product.colorSummary}
            />
          </div>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={`desktop-${product.id}`}
            className="h-full"
          >
            <ProductCard
              id={product.id}
              slug={product.slug}
              name={product.name}
              brand={product.brand}
              price={product.price}
              salePrice={product.salePrice}
              imageUrl={product.imageUrl}
              secondaryImageUrl={product.secondaryImageUrl}
              gallery={product.gallery}
              isOnSale={product.isOnSale}
              colorSummary={product.colorSummary}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
