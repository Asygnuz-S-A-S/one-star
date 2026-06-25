"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"
import ProductCard from "@/components/home/ProductCard"

interface ProductItem {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  isOnSale?: boolean
}

export default function FeaturedProductsGrid({ products }: { products: ProductItem[] }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(gridRef, { once: true, margin: "-80px" })

  return (
    <div ref={gridRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {products.map((product, i) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.38, delay: i * 0.06, ease: "easeOut" }}
        >
          <ProductCard
            id={product.id}
            slug={product.slug}
            name={product.name}
            brand={product.brand}
            price={product.price}
            salePrice={product.salePrice}
            imageUrl={product.imageUrl}
            isOnSale={product.isOnSale}
          />
        </motion.div>
      ))}
    </div>
  )
}
