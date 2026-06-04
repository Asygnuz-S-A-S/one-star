"use client"

import { useRef } from "react"
import { motion, useInView } from "motion/react"
import ProductCard from "@/components/home/ProductCard"

interface Product {
  id: string
  name: string
  brand: string
  price: number
  salePrice?: number
  isNew?: boolean
  isOnSale?: boolean
}

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Air Max 90", brand: "Nike", price: 450000, salePrice: 360000, isOnSale: true },
  { id: "2", name: "Fresh Foam 1080", brand: "New Balance", price: 580000, isNew: true },
  { id: "3", name: "Clifton 9", brand: "Hoka", price: 620000 },
  { id: "4", name: "Cloud X 3", brand: "On Running", price: 720000, isNew: true },
  { id: "5", name: "990v6", brand: "New Balance", price: 850000 },
  { id: "6", name: "Ultraboost 23", brand: "Adidas", price: 480000, salePrice: 380000, isOnSale: true },
  { id: "7", name: "Gel-Nimbus 25", brand: "Asics", price: 520000 },
  { id: "8", name: "Séville Leather", brand: "Veja", price: 380000, isNew: true },
]

export default function FeaturedProducts() {
  const gridRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(gridRef, { once: true, margin: "-80px" })

  return (
    <section className="px-4 md:px-8 lg:px-16 py-12 md:py-16">
      {/* Section header */}
      <motion.div
        className="mb-8 md:mb-12"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.35 }}
      >
        <h2 className="font-[var(--font-barlow)] font-black uppercase text-3xl md:text-4xl text-[#1C1C1C] tracking-tight leading-none">
          Destacados
        </h2>
        <div className="w-12 h-1 bg-[#E31C23] mt-3" />
      </motion.div>

      {/* Grid — stagger on viewport enter */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
      >
        {MOCK_PRODUCTS.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.38, delay: i * 0.06, ease: "easeOut" }}
          >
            <ProductCard {...product} />
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        className="text-center mt-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <a
          href="/productos"
          className="inline-block border-2 border-[#1C1C1C] text-[#1C1C1C] font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-10 py-4 hover:bg-[#1C1C1C] hover:text-white transition-colors duration-200"
        >
          Ver Todos los Productos
        </a>
      </motion.div>
    </section>
  )
}
