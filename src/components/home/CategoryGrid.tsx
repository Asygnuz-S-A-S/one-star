"use client"

import Link from "next/link"
import { motion } from "motion/react"
import type { HomeGridBlock } from "@prisma/client"

const CARD_HEIGHT: Record<string, string> = {
  sm: "h-32",
  md: "h-40",
  lg: "h-48",
  xl: "h-60",
}

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
}

const TITLE_ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
}

const BG_IMAGES: Record<string, string> = {
  "lanzamientos": "https://images.unsplash.com/photo-1552346154-21d32810baa3?auto=format&fit=crop&q=80&w=800",
  "hombre": "https://images.unsplash.com/photo-1515347619362-673471015f8d?auto=format&fit=crop&q=80&w=800",
  "mujer": "https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&q=80&w=800",
  "niños": "https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&q=80&w=800",
  "accesorios": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800",
  "sale": "https://images.unsplash.com/photo-1607083206968-13611e3d76ba?auto=format&fit=crop&q=80&w=800",
  "tarjeta\nregalo": "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=800",
}

export default function CategoryGrid({
  blocks,
  config = {},
}: {
  blocks: HomeGridBlock[]
  config?: Record<string, any>
}) {
  const title = config.title as string | undefined
  const subtitle = config.subtitle as string | undefined
  const columns = (config.columns as number) || 4
  const cardHeight = (config.cardHeight as string) || "md"
  const theme = (config.theme as "light" | "dark") || "light"
  const isDark = theme === "dark"
  const titleColor = isDark ? "text-white" : "text-[#1C1C1C]"
  const subtitleColor = isDark ? "text-gray-400" : "text-[#4A4A4A]"
  const sectionBg = isDark ? "bg-[#1C1C1C]" : (config.bgSection as string || "transparent")
  
  const titleAlign = (config.titleAlign as string) || "center"
  const showAccent = config.showAccent !== false

  const cardH = CARD_HEIGHT[cardHeight] ?? "h-40"
  const gridCols = GRID_COLS[columns] ?? "grid-cols-4"
  const titleAlignCls = TITLE_ALIGN[titleAlign] ?? "text-center"
  const accentAlign = titleAlign === "left" ? "mr-auto" : titleAlign === "right" ? "ml-auto" : "mx-auto"

  return (
    <section
      className="py-8 md:py-12"
      style={{ backgroundColor: sectionBg !== "transparent" ? sectionBg : undefined }}
    >
      {(title || subtitle) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className={`mb-6 md:mb-8 px-4 md:px-8 lg:px-16 ${titleAlignCls}`}
        >
          {title && (
            <h2 className={`font-[var(--font-barlow)] font-black uppercase text-2xl md:text-3xl tracking-tight ${titleColor}`}>
              {title}
            </h2>
          )}
          {showAccent && title && (
            <div className={`w-12 h-1 bg-[#E31C23] mt-3 ${accentAlign}`} />
          )}
          {subtitle && (
            <p className={`text-sm mt-2 ${subtitleColor}`}>{subtitle}</p>
          )}
        </motion.div>
      )}

      {/* Mobile: horizontal scroll */}
      <motion.div 
        className="flex md:hidden gap-0 overflow-x-auto scrollbar-hide pb-2"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {blocks.map((cat) => (
          <motion.div 
            key={cat.id} 
            className="shrink-0"
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
          >
            <Link
              href={cat.href}
              className={`${cat.bgColor} w-40 md:w-56 ${cardH} relative overflow-hidden flex flex-col items-center justify-center gap-2 group transition-all duration-300 rounded-none`}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-70 transition-all duration-700 group-hover:scale-110" 
                style={{ backgroundImage: BG_IMAGES[cat.label.toLowerCase()] ? `url(${BG_IMAGES[cat.label.toLowerCase()]})` : undefined }}
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300 z-0" />
              
              <span
                className={`font-[var(--font-barlow)] font-bold uppercase text-sm text-center leading-tight whitespace-pre-line px-2 relative z-10 tracking-widest text-white`}
              >
                {cat.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Desktop: configurable grid */}
      <motion.div 
        className={`hidden md:grid ${gridCols} gap-0`}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
        }}
      >
        {blocks.map((cat, i) => (
          <motion.div
            key={cat.id}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
          >
            <Link
              href={cat.href}
              className={`${cat.bgColor} ${cardH} w-full relative overflow-hidden flex flex-col items-center justify-center gap-3 group transition-all duration-500 rounded-none`}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-70 transition-all duration-700 group-hover:scale-110 z-0" 
                style={{ backgroundImage: BG_IMAGES[cat.label.toLowerCase()] ? `url(${BG_IMAGES[cat.label.toLowerCase()]})` : undefined }}
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 z-0" />
              
              <span
                className={`font-[var(--font-barlow)] font-black uppercase text-xl text-center leading-tight whitespace-pre-line px-4 relative z-10 tracking-widest group-hover:-translate-y-2 transition-transform duration-500 text-white`}
              >
                {cat.label}
              </span>
              
              <div className={`absolute bottom-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 z-10 font-[var(--font-barlow)] text-sm font-bold uppercase tracking-widest text-white`}>
                Explorar →
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
