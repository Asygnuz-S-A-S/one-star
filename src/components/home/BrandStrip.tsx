"use client"

import React, { useState } from "react"
import { motion } from "motion/react"
import Link from "next/link"

export interface BrandItem {
  id?: string
  name: string
  slug?: string
  logoUrl?: string | null
  isActive?: boolean
}

const DEFAULT_BRANDS: BrandItem[] = [
  { name: "Nike", slug: "nike" },
  { name: "New Balance", slug: "new-balance" },
  { name: "Adidas", slug: "adidas" },
  { name: "Jordan", slug: "jordan" },
  { name: "Puma", slug: "puma" },
  { name: "Vans", slug: "vans" },
  { name: "Converse", slug: "converse" },
  { name: "Asics", slug: "asics" },
]

const FONT_SIZES: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
}

const LOGO_HEIGHTS: Record<string, { container: string; imgHeight: number }> = {
  xs: { container: "h-6 md:h-7", imgHeight: 28 },
  sm: { container: "h-8 md:h-9", imgHeight: 36 },
  md: { container: "h-10 md:h-12", imgHeight: 48 },
  lg: { container: "h-14 md:h-16", imgHeight: 64 },
}

export default function BrandStrip({
  brands = [],
  config = {},
}: {
  brands?: (string | BrandItem)[]
  config?: Record<string, unknown>
}) {
  const [isHovered, setIsHovered] = useState(false)

  // Normalizar marcas a formato BrandItem
  const normalizedBrands: BrandItem[] = (brands && brands.length > 0 ? brands : DEFAULT_BRANDS).map(
    (b) => (typeof b === "string" ? { name: b, slug: b.toLowerCase().replace(/\s+/g, "-") } : b)
  )

  // Customization from config
  const title = typeof config.title === "string" ? config.title : undefined
  const separator = typeof config.separator === "string" && config.separator ? config.separator : "·"
  const bgSection = typeof config.bgSection === "string" && config.bgSection ? config.bgSection : "#E0E0E0"
  const textColor = typeof config.textColor === "string" && config.textColor ? config.textColor : "#4A4A4A"
  const fontSize = typeof config.fontSize === "string" ? config.fontSize : "sm"
  const displayMode = (typeof config.displayMode === "string" ? config.displayMode : "auto") as "auto" | "logoOnly" | "textOnly"
  const logoSize = (typeof config.logoSize === "string" ? config.logoSize : "md") as "xs" | "sm" | "md" | "lg"
  const speed = typeof config.speed === "number" ? config.speed : 24
  const grayscale = config.grayscale !== false
  const pauseOnHover = config.pauseOnHover !== false
  const linkToBrand = config.linkToBrand !== false

  const fontSizeClass = FONT_SIZES[fontSize] || "text-sm"
  const logoHeightConfig = LOGO_HEIGHTS[logoSize] || LOGO_HEIGHTS.md

  // Duplicar marcas para scroll infinito fluido
  const displayList = [...normalizedBrands, ...normalizedBrands, ...normalizedBrands, ...normalizedBrands]

  return (
    <section 
      className="py-8 overflow-hidden relative select-none"
      style={{ backgroundColor: bgSection }}
      onMouseEnter={() => pauseOnHover && setIsHovered(true)}
      onMouseLeave={() => pauseOnHover && setIsHovered(false)}
      aria-label={title || "Carrusel de marcas destacadas"}
    >
      {title && (
        <div className="text-center mb-6 px-4">
          <h2 className="font-[var(--font-barlow)] font-bold uppercase tracking-wider text-sm md:text-base text-[#1C1C1C]">
            {title}
          </h2>
        </div>
      )}
      
      {/* Infinite Marquee using Motion */}
      <div className="relative flex whitespace-nowrap overflow-hidden">
        <motion.div
          className="flex whitespace-nowrap items-center"
          animate={isHovered ? {} : { x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: speed,
          }}
        >
          {displayList.map((brand, i) => {
            const hasLogo = Boolean(brand.logoUrl)
            const showLogo = (displayMode === "auto" && hasLogo) || (displayMode === "logoOnly" && hasLogo)
            const brandHref = `/productos?brand=${encodeURIComponent(brand.name)}`

            const content = (
              <div className="inline-flex items-center gap-6 group transition-transform duration-200 hover:scale-105">
                {showLogo && brand.logoUrl ? (
                  <div className={`relative ${logoHeightConfig.container} w-auto min-w-[60px] max-w-[140px] flex items-center justify-center`}>
                    {/* Contenedor del Logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={brand.logoUrl}
                      alt={`Logo de ${brand.name}`}
                      className={`h-full w-auto max-h-full object-contain transition-all duration-300 ${
                        grayscale ? "filter grayscale opacity-75 group-hover:grayscale-0 group-hover:opacity-100" : "opacity-90 group-hover:opacity-100"
                      }`}
                    />
                  </div>
                ) : (
                  <span
                    className={`font-[var(--font-barlow)] font-bold uppercase tracking-widest transition-colors duration-200 group-hover:text-[#E31C23] ${fontSizeClass}`}
                    style={{ color: textColor }}
                  >
                    {brand.name}
                  </span>
                )}

                {separator && (
                  <span 
                    className="text-sm select-none" 
                    style={{ color: textColor, opacity: 0.35 }}
                  >
                    {separator}
                  </span>
                )}
              </div>
            )

            return (
              <div key={`${brand.name}-${i}`} className="mx-6 shrink-0 flex items-center">
                {linkToBrand ? (
                  <Link href={brandHref} title={`Ver productos de ${brand.name}`}>
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
