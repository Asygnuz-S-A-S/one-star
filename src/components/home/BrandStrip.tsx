"use client"

import { motion } from "motion/react"

const DEFAULT_BRANDS = ["Nike", "New Balance", "Hoka", "Veja", "On Running", "Adidas", "Asics"]

const FONT_SIZES: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
}

export default function BrandStrip({
  brands = [],
  config = {},
}: {
  brands?: string[]
  config?: Record<string, unknown>
}) {
  const activeBrands = brands.length > 0 ? brands : DEFAULT_BRANDS
  const allBrands = [...activeBrands, ...activeBrands]
  
  // Customization from config
  const title = typeof config.title === "string" ? config.title : undefined
  const separator = typeof config.separator === "string" && config.separator ? config.separator : "·"
  const bgSection = typeof config.bgSection === "string" && config.bgSection ? config.bgSection : "#E0E0E0"
  const textColor = typeof config.textColor === "string" && config.textColor ? config.textColor : "#4A4A4A"
  const fontSize = typeof config.fontSize === "string" ? config.fontSize : "sm"
  
  const fontSizeClass = FONT_SIZES[fontSize] || "text-sm"

  return (
    <section 
      className="py-8 overflow-hidden relative"
      style={{ backgroundColor: bgSection }}
    >
      {title && (
        <div className="text-center mb-6">
          <h2 className="font-[var(--font-barlow)] font-bold uppercase tracking-wider text-sm md:text-base text-[#1C1C1C]">
            {title}
          </h2>
        </div>
      )}
      
      {/* Infinite Marquee using Motion */}
      <div className="relative flex whitespace-nowrap overflow-hidden">
        <motion.div
          className="flex whitespace-nowrap items-center"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            ease: "linear",
            duration: 20 // Adjust speed here
          }}
        >
          {/* We repeat the array 4 times to ensure it fills wide screens */}
          {[...allBrands, ...allBrands].map((brand, i) => (
            <span
              key={i}
              className={`font-[var(--font-barlow)] font-bold uppercase tracking-widest mx-8 shrink-0 flex items-center gap-8 ${fontSizeClass}`}
              style={{ color: textColor }}
            >
              <span className="hover:text-[#E31C23] hover:scale-110 transition-all cursor-pointer">{brand}</span>
              <span style={{ opacity: 0.4 }}>{separator}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
