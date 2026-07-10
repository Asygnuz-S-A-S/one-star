"use client"

import Link from "next/link"
import { motion } from "motion/react"
import ProductCard from "@/components/home/ProductCard"
import type { ProductDTO } from "@/server/services/product.service"

interface Props {
  products: ProductDTO[]
  /** Cambia cuando cambian los filtros para re-disparar la animación */
  animationKey: string
}

export function AnimatedProductGrid({ products, animationKey }: Props) {
  return (
    <div
      key={animationKey}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4 md:px-8 py-6"
    >
      {products.map((product, i) => {
        const image = product.images[0]
        const secondaryImage = product.images[1]
        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.32,
              delay: Math.min(i * 0.05, 0.35),
              ease: "easeOut",
            }}
          >
            <Link href={`/productos/${product.slug}`}>
              <ProductCard
                id={product.id}
                name={product.name}
                brand={product.brand ?? "One Star"}
                price={product.basePrice}
                salePrice={product.salePrice ?? undefined}
                imageUrl={image?.url}
                secondaryImageUrl={secondaryImage?.url}
                isOnSale={product.isOnSale} isNew={product.isNew} hasStock={product.hasStock}
              />
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
