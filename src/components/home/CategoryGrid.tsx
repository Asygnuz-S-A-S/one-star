"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { HomeGridBlock } from "@prisma/client"

import { resolveCollectionTiles, type EditorialAppearance } from "@/lib/editorial-config"
import { canUseNextImageOptimization } from "@/lib/image-optimization"
import { safePublicUrl } from "@/lib/safe-url"
import ScrollReveal from "@/components/home/ScrollReveal"

const TITLE_ALIGN: Record<string, string> = { left: "text-left", center: "text-center", right: "text-right" }

// Superficie única para todas las colecciones (homogénea y elegante). La apariencia del
// constructor solo cambia el acento (índice y línea): rojo para destacar, p. ej., Sale.
const ACCENT: Record<EditorialAppearance, string> = {
  light: "text-[#1C1C1C]/45",
  carbon: "text-[#1C1C1C]/45",
  oneStarRed: "text-[#E31C23]",
}

type TileOptions = { appearance: EditorialAppearance; alt?: string; href?: string; src?: string; title?: string }

/**
 * Mosaico editorial: la primera colección es la destacada (2×2) y el último tile se estira
 * para cerrar la fila, así la grilla nunca queda con huecos sin importar cuántas haya.
 */
function tileLayout(index: number, total: number): string {
  if (index === 0) return "col-span-2 aspect-[4/3] md:aspect-auto md:row-span-2"
  const isLast = index === total - 1
  const mobileSpan = isLast && (total - 1) % 2 === 1 ? "col-span-2 aspect-[2/1]" : "aspect-[4/5]"
  // En escritorio: el destacado ocupa 4 celdas; las demás 1. Lo que sobra de la última fila lo toma el último.
  const used = 4 + (total - 1)
  const remainder = used % 4
  const desktopSpan = isLast && remainder !== 0 ? ["", "md:col-span-4", "md:col-span-3", "md:col-span-2"][remainder] ?? "" : ""
  return `${mobileSpan} md:aspect-auto ${desktopSpan}`
}

function CollectionTile({ block, index, total, options }: { block: HomeGridBlock; index: number; total: number; options: TileOptions }) {
  const [mediaFailed, setMediaFailed] = useState(false)
  const hasMedia = Boolean(options.src && !mediaFailed)
  const title = options.title ?? block.label
  const label = `Imagen de ${title} próximamente`
  const featured = index === 0
  const accent = ACCENT[options.appearance]

  return (
    <Link
      href={safePublicUrl(options.href ?? block.href, "/")}
      className={`${tileLayout(index, total)} group relative isolate flex flex-col overflow-hidden rounded-[var(--store-radius-lg)] bg-[linear-gradient(180deg,#f6f5f2_0%,#ebeae6_100%)] text-[#1C1C1C] ring-1 ring-black/[0.04] transition-[box-shadow,background-color] duration-500 ease-out hover:shadow-[0_22px_44px_-26px_rgb(28_28_28/0.35)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-focus)]`}
    >
      <span className={`relative flex items-center justify-between px-5 pt-5 font-barlow text-[11px] font-bold uppercase tracking-[0.22em] md:px-6 md:pt-6 ${accent}`}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        {featured && <span className="text-[#1C1C1C]/45">Colección destacada</span>}
      </span>

      {/* Producto posado sobre la superficie: la foto (fondo blanco) se funde con multiply.
          Transform solo en la imagen y sin z-index en los contenedores para no aislar el blend. */}
      <span className={`pointer-events-none absolute inset-x-0 flex items-center justify-center ${featured ? "bottom-[30%] top-[12%] md:bottom-[14%] md:top-[12%]" : "bottom-[22%] top-[12%]"}`}>
        {hasMedia && options.src ? (
          <span className={`relative block h-full ${featured ? "w-[78%] md:w-[70%]" : "w-[86%]"}`}>
            <Image
              src={options.src}
              alt={options.alt ?? title}
              fill
              sizes={featured ? "(max-width: 767px) 80vw, 40vw" : "(max-width: 767px) 45vw, 20vw"}
              unoptimized={!canUseNextImageOptimization(options.src)}
              className="-rotate-[6deg] object-contain mix-blend-multiply transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:-rotate-[2deg] motion-safe:group-hover:scale-[1.05]"
              data-testid="collection-tile-media"
              onError={() => setMediaFailed(true)}
            />
          </span>
        ) : (
          <span className="grid h-full w-full place-items-center" data-testid="collection-tile-fallback" role="img" aria-label={label}>
            <span aria-hidden="true" className="font-barlow text-7xl font-black uppercase leading-none text-[#1C1C1C]/10">{title.charAt(0)}</span>
          </span>
        )}
      </span>
      {/* Sombra de contacto: el tenis "apoya" en la superficie en vez de flotar en un recuadro. */}
      <span aria-hidden="true" className={`pointer-events-none absolute left-1/2 h-5 -translate-x-1/2 rounded-[50%] bg-black/[0.08] blur-md transition-[width,opacity] duration-700 group-hover:opacity-60 max-w-[15rem] ${featured ? "bottom-[28%] w-[46%] md:bottom-[13%] md:max-w-[22rem]" : "bottom-[20%] w-[56%]"}`} />

      <span className="relative mt-auto flex items-end justify-between gap-3 px-5 pb-5 md:px-6 md:pb-6">
        <span className="min-w-0">
          <span className={`block font-barlow font-bold uppercase leading-[0.95] tracking-[-0.01em] [overflow-wrap:anywhere] ${featured ? "text-3xl md:text-5xl" : "text-lg md:text-xl"}`}>{title}</span>
          <span className="mt-2 inline-flex items-center gap-2 font-montserrat text-xs font-medium text-[#1C1C1C]/60 transition-colors group-hover:text-[#1C1C1C]">
            Explorar
            <span aria-hidden="true" className="block h-px w-5 bg-current transition-[width] duration-300 group-hover:w-9" />
          </span>
        </span>
      </span>
    </Link>
  )
}

export default function CategoryGrid({ blocks, config = {} }: { blocks: HomeGridBlock[]; config?: Record<string, unknown> }) {
  const title = typeof config.title === "string" ? config.title : undefined
  const subtitle = typeof config.subtitle === "string" ? config.subtitle : undefined
  const theme = config.theme === "dark" ? "dark" : "light"
  const isDark = theme === "dark"
  const sectionBg = isDark ? "#1C1C1C" : typeof config.bgSection === "string" ? config.bgSection : undefined
  const titleAlign = typeof config.titleAlign === "string" ? config.titleAlign : "left"
  const showAccent = config.showAccent !== false
  const options = resolveCollectionTiles(config)
  const titleAlignCls = TITLE_ALIGN[titleAlign] ?? TITLE_ALIGN.left
  const accentAlign = titleAlign === "left" ? "mr-auto" : titleAlign === "right" ? "ml-auto" : "mx-auto"

  return (
    <section data-testid="home-category-grid" className={`store-section text-foreground ${isDark ? "dark" : ""}`} style={sectionBg ? { backgroundColor: sectionBg } : undefined}>
      {(title || subtitle) && (
        <div className="store-gutter mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
          <div className={titleAlignCls}>
            {title && <h2 className="store-heading">{title}</h2>}
            {showAccent && title && <div className={`mt-3 h-1 w-12 bg-[var(--store-action)] ${accentAlign}`} />}
            {subtitle && <p className="mt-3 max-w-xl text-sm text-[var(--store-muted)]">{subtitle}</p>}
          </div>
          <Link href="/productos" className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-bold uppercase tracking-[0.12em] text-[var(--store-ink)] underline-offset-8 hover:underline">
            Ver todo el catálogo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        </div>
      )}
      <ScrollReveal>
        <div className="store-gutter grid grid-cols-2 gap-3 md:auto-rows-[15rem] md:grid-cols-4 md:gap-4 xl:auto-rows-[17rem]">
          {blocks.map((block, index) => (
            <CollectionTile key={block.id} block={block} index={index} total={blocks.length} options={options.get(block.id) ?? { appearance: "light" }} />
          ))}
        </div>
      </ScrollReveal>
    </section>
  )
}
