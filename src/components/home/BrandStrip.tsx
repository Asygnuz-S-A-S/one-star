"use client"

import React, { useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import Link from "next/link"
import { resolveBrandLogoUrl } from "@/lib/brand-logos"

export interface BrandItem {
  id?: string
  name: string
  slug?: string
  logoUrl?: string | null
  isActive?: boolean
}

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
  md: { container: "h-14 md:h-16", imgHeight: 64 },
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
  const shouldReduceMotion = useReducedMotion()

  // Normalizar marcas a formato BrandItem y resolver logos por defecto
  const normalizedBrands: BrandItem[] = (brands ?? []).map(
    (b) => {
      const item: BrandItem = typeof b === "string" ? { name: b, slug: b.toLowerCase().replace(/\s+/g, "-") } : b
      return {
        ...item,
        logoUrl: resolveBrandLogoUrl(item) ?? item.logoUrl,
      }
    }
  )

  if (normalizedBrands.length === 0) return null

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

  // Burbujas: logos en círculo que se deslizan a mano (sin animación), como acceso rápido por marca.
  if (config.style === "bubbles") {
    return (
      <section className="py-8 md:py-10" style={{ backgroundColor: bgSection }} aria-label={title || "Compra por marca"} data-testid="brand-bubbles">
        {title && <h2 className="store-gutter store-heading mb-4 md:mb-6">{title}</h2>}
        <ul className="store-gutter flex snap-x [scroll-padding-inline:var(--store-gutter)] scrollbar-hide gap-4 overflow-x-auto pb-2 md:gap-6">
          {normalizedBrands.map((brand) => {
            const brandHref = brand.slug ? `/marcas/${brand.slug}` : `/productos?marca=${encodeURIComponent(brand.name)}`
            const bubble = (
              <>
                <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-[var(--store-line)] bg-white p-3 transition-transform duration-200 group-hover:scale-105 md:h-24 md:w-24">
                  {displayMode !== "textOnly" && brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt="" className={`max-h-full max-w-full object-contain ${grayscale ? "grayscale group-hover:grayscale-0" : ""}`} />
                  ) : (
                    <span className="font-barlow text-xs font-bold uppercase tracking-wider" style={{ color: textColor }}>{brand.name}</span>
                  )}
                </span>
                <span className={`mt-2 block text-center font-montserrat ${fontSizeClass}`} style={{ color: textColor }}>{brand.name}</span>
              </>
            )
            return (
              <li key={brand.name} className="shrink-0 snap-start">
                {linkToBrand ? (
                  <Link href={brandHref} className="group block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-action)]">{bubble}</Link>
                ) : (
                  <div className="group">{bubble}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

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
          <h2 className="font-barlow font-bold uppercase tracking-wider text-sm md:text-base text-[#1C1C1C]">
            {title}
          </h2>
        </div>
      )}
      
      {/* Infinite Marquee using Motion */}
      <div className="relative flex whitespace-nowrap overflow-hidden">
        <motion.div
          className="flex whitespace-nowrap items-center"
          animate={isHovered || shouldReduceMotion ? {} : { x: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: speed }}
        >
          {displayList.map((brand, i) => {
            const hasLogo = Boolean(brand.logoUrl)
            const showLogo = (displayMode === "auto" && hasLogo) || (displayMode === "logoOnly" && hasLogo)
            // El catálogo filtra con ?marca=, no ?brand=: el enlace anterior no filtraba nada.
            const brandHref = brand.slug
              ? `/marcas/${brand.slug}`
              : `/productos?marca=${encodeURIComponent(brand.name)}`

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
                    className={`font-barlow font-bold uppercase tracking-widest transition-colors duration-200 group-hover:text-[#E31C23] ${fontSizeClass}`}
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
                  <Link
                    href={brandHref}
                    title={`Ver productos de ${brand.name}`}
                    tabIndex={i < normalizedBrands.length ? undefined : -1}
                    aria-hidden={i < normalizedBrands.length ? undefined : true}
                  >
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
