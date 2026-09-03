"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "motion/react"
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
  isOnSale?: boolean
  colorSummary?: ProductCardColorSummary
}

interface NewArrivalsLayoutProps {
  title: string
  subtitle: string
  total: number
  products: ProductItem[]
  theme?: "light" | "dark"
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default function NewArrivalsLayout({ title, subtitle, total, products, theme = "light" }: NewArrivalsLayoutProps) {
  if (products.length === 0) return null
  const [hero, ...rest] = products

  const isDark = theme === "dark"

  return (
    <section className={`px-4 md:px-8 lg:px-16 py-12 md:py-16 bg-surface-2 text-foreground ${isDark ? "dark" : ""}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-[var(--font-barlow)] font-black uppercase text-3xl md:text-4xl tracking-tight leading-none text-foreground">
            {title}
          </h2>
          <div className="w-12 h-1 bg-[#E31C23] mt-3" />
        </motion.div>
        <span className="inline-flex items-center gap-2 bg-foreground text-background font-[var(--font-barlow)] font-bold uppercase text-xs tracking-wider px-4 py-2 self-start md:self-auto">
          <span className="w-2 h-2 bg-[#E31C23] rounded-full inline-block" />
          {total} {total === 1 ? subtitle.replace(/s$/i, "") : subtitle}
        </span>
      </div>

      {/* Mobile: horizontal scroll */}
      <motion.div 
        className="flex md:hidden gap-4 overflow-x-auto scrollbar-hide pb-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {[hero, ...rest].map((p) => (
          <motion.div
            key={`mobile-${p.id}`}
            className="w-64 shrink-0"
            variants={{
              hidden: { opacity: 0, x: 24 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
            }}
          >
            <ProductCard {...p} />
          </motion.div>
        ))}
      </motion.div>

      {/* Desktop: hero + grid */}
      <motion.div 
        className="hidden md:grid grid-cols-3 gap-4"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {/* Hero */}
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } }
          }}
          className="col-span-2"
        >
          <Link href={`/productos/${hero.slug}`} className="group cursor-pointer block">
            <div className="relative aspect-[16/9] bg-[#E0E0E0] overflow-hidden mb-3">
              {hero.imageUrl ? (
                <Image
                  src={hero.imageUrl}
                  alt={hero.name}
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 1280px) 66vw, 800px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="120" height="120" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#4A4A4A]/20">
                    <path d="M8 40 C8 40 12 28 24 28 C30 28 34 32 40 32 C46 32 52 28 56 30 L56 42 C56 44 54 46 52 46 L12 46 C10 46 8 44 8 42 Z" fill="currentColor" />
                    <path d="M24 28 L20 18 L28 18 L32 28" fill="currentColor" opacity="0.6" />
                  </svg>
                </div>
              )}

              <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="font-[var(--font-montserrat)] text-white/80 text-xs uppercase tracking-wider mb-1">{hero.brand}</p>
                <h3 className="font-[var(--font-barlow)] font-black uppercase text-white text-2xl leading-none mb-2">{hero.name}</h3>
                <p className="font-[var(--font-montserrat)] font-bold text-white text-sm">{formatPrice(hero.price)}</p>
              </div>

              <span className="absolute top-4 left-4 bg-[#1C1C1C] text-white text-[10px] font-[var(--font-barlow)] font-bold uppercase tracking-wider px-2 py-1">
                NUEVO
              </span>
            </div>
          </Link>

          <div>
              <p className="font-[var(--font-montserrat)] text-xs uppercase tracking-wider mb-1 text-[var(--text-secondary)]">{hero.brand}</p>
              <Link href={`/productos/${hero.slug}`} className="inline-block">
                <h3 className="font-[var(--font-barlow)] font-semibold text-base leading-tight mb-2 text-foreground">{hero.name}</h3>
              </Link>
              <span className="font-[var(--font-montserrat)] font-bold text-sm text-foreground">{formatPrice(hero.price)}</span>
              {hero.colorSummary && hero.colorSummary.imageOptions.length > 0 && (
                <div className="relative z-30 mt-3">
                  <p className="mb-1 text-xs text-[var(--text-secondary)]">{hero.colorSummary.label}</p>
                  <div
                    className="flex max-w-full gap-2 overflow-x-auto pb-1"
                    aria-label={`Colores disponibles de ${hero.name}`}
                  >
                    {hero.colorSummary.imageOptions.map((option) => (
                      <Link
                        key={`${option.productId}-${option.name}`}
                        href={`/productos/${option.slug ?? hero.slug}?color=${encodeURIComponent(option.name)}`}
                        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm ring-1 ring-[#D4D4D4]"
                        aria-label={`Ver ${option.productName ?? hero.name} en color ${option.name}`}
                      >
                        <Image src={option.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </motion.div>

        {/* Rest */}
        <div className="flex flex-col gap-4">
          {rest.map((p) => (
            <motion.div
              key={p.id}
              variants={{
                hidden: { opacity: 0, x: 30 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
              }}
            >
              <ProductCard {...p} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <div className="text-center mt-10">
        <Link
          href="/productos?categoria=lanzamientos"
          className="inline-block border-2 border-foreground text-foreground font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-10 py-4 transition-colors duration-200 hover:bg-foreground hover:text-background"
        >
          Ver Todos los Lanzamientos
        </Link>
      </div>
    </section>
  )
}
