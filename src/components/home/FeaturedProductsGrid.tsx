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
  secondaryImageUrl?: string
  isNew?: boolean
  isOnSale?: boolean
}

export default function FeaturedProductsGrid({ products, theme = "light" }: { products: ProductItem[], theme?: "light" | "dark" }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(gridRef, { once: true, margin: "-80px" })

  return (
    <div ref={gridRef}>
      {/* Mobile: horizontal scroll */}
      <motion.div 
        className="flex md:hidden gap-4 overflow-x-auto scrollbar-hide pb-4"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {products.map((product) => (
          <motion.div
            key={`mobile-${product.id}`}
            className="w-48 shrink-0"
            variants={{
              hidden: { opacity: 0, x: 24 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
            }}
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
              isOnSale={product.isOnSale}
              theme={theme}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Desktop: grid */}
      <motion.div 
        className="hidden md:grid md:grid-cols-4 gap-6"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
      >
        {products.map((product) => (
          <motion.div
            key={`desktop-${product.id}`}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
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
              isOnSale={product.isOnSale}
              theme={theme}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
