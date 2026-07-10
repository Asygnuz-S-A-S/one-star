"use client"

import { useRef, useState, useEffect } from "react"
import { motion } from "motion/react"
import Link from "next/link"
import ProductCard from "./ProductCard"

interface ProductItem {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  secondaryImageUrl?: string
  isOnSale?: boolean
}

interface ProductCarouselClientProps {
  title: string
  products: ProductItem[]
  theme?: "light" | "dark"
}

export default function ProductCarouselClient({ title, products, theme = "light" }: ProductCarouselClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [products])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current
      const scrollAmount = direction === "left" ? -clientWidth : clientWidth
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
  }

  const isDark = theme === "dark"
  const sectionBg = isDark ? "bg-[#1C1C1C]" : "bg-white"
  const titleColor = isDark ? "text-[#1C1C1C] bg-white" : "text-[#1C1C1C] bg-[#F0F0F0]"
  const titleContainerBg = isDark ? "bg-white" : "bg-[#F0F0F0]"
  const btnBorder = isDark ? "border-white text-white hover:bg-white hover:text-[#1C1C1C]" : "border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white"
  const arrowBtn = isDark ? "text-white disabled:opacity-30" : "text-[#1C1C1C] disabled:opacity-30"

  if (products.length === 0) return null

  return (
    <section className={`py-12 md:py-16 ${sectionBg}`}>
      <div className="px-4 md:px-8 lg:px-16 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title with highlighted background */}
        <div className="inline-block">
          <h2 className={`font-[var(--font-barlow)] font-black uppercase text-2xl md:text-3xl tracking-tight leading-none px-2 py-1 ${titleColor}`}>
            {title}
          </h2>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Link
            href="/productos"
            className={`font-[var(--font-montserrat)] text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-full border transition-colors ${btnBorder}`}
          >
            Ver Todo
          </Link>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`p-1 transition-opacity ${arrowBtn}`}
              aria-label="Anterior"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`p-1 transition-opacity ${arrowBtn}`}
              aria-label="Siguiente"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="pl-4 md:pl-8 lg:pl-16 pr-4 md:pr-8 lg:pr-16">
        <div 
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              className="w-[280px] md:w-[320px] shrink-0 snap-start"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
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
                isNew={product.isNew}
                hasStock={product.hasStock}
                theme={theme}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
