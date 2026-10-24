"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "motion/react"
import type { ProductCardColorSummary } from "@/lib/product-card-colors"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"
import { stageVideoSources } from "@/lib/cloudinary-video"

interface ProductItem {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  videoUrl?: string
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

const AUTOPLAY_MS = 7000
// Misma superficie concreto de categorías y ficha: las fotos y videos de fondo blanco se funden con multiply.
const SURFACE = "bg-[radial-gradient(ellipse_at_50%_42%,#ffffff_0%,#f4f3f0_48%,#e8e7e3_100%)]"

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

const pad = (value: number) => String(value).padStart(2, "0")

/** Foto con respaldo: si la URL no carga se muestra la imagen predeterminada de la tienda, no un ícono roto. */
function SafeImage({ src, alt, sizes, className }: { src?: string; alt: string; sizes: string; className: string }) {
  const [failed, setFailed] = useState(false)
  return <Image src={!src || failed ? PLACEHOLDER_IMAGE_URL : src} alt={alt} fill sizes={sizes} className={className} onError={() => setFailed(true)} />
}

/** Escenario: video del lanzamiento (silenciado, en bucle, solo mientras se ve) o su foto. */
function StageMedia({ product }: { product: ProductItem }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined)
      else video.pause()
    }, { threshold: 0.35 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [product.id])

  const video = product.videoUrl ? stageVideoSources(product.videoUrl) : null

  return video ? (
    // El <video> no se estira con top/bottom: se posiciona el contenedor y el video lo llena.
    // El realce lleva el fondo gris claro del estudio (≈235) a blanco y multiply lo funde con la superficie.
    <span className="absolute inset-x-4 inset-y-0 md:inset-x-8">
      <video
        key={product.id}
        ref={ref}
        src={video.src}
        poster={video.poster ?? product.imageUrl}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`Video de ${product.name}`}
        className="h-full w-full object-contain mix-blend-multiply brightness-[1.1] contrast-[1.06] motion-safe:animate-[hero-copy-swap_500ms_cubic-bezier(.22,1,.36,1)]"
      />
    </span>
  ) : (
    <span className="absolute inset-0">
      <SafeImage
        key={product.id}
        src={product.imageUrl}
        alt={product.name}
        sizes="(max-width: 1024px) 92vw, 58vw"
        className="object-contain p-[6%] mix-blend-multiply motion-safe:animate-[hero-copy-swap_500ms_cubic-bezier(.22,1,.36,1)]"
      />
    </span>
  )
}

export default function NewArrivalsLayout({ title, subtitle, total, products, theme = "light" }: NewArrivalsLayoutProps) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = Boolean(useReducedMotion())
  const isDark = theme === "dark"
  const count = products.length
  const current = products[Math.min(active, count - 1)]
  const countLabel = total === 1 ? subtitle.split(" ").map((word) => word.replace(/s$/i, "")).join(" ") : subtitle

  // Avanza solo entre drops como un reproductor; se detiene al interactuar.
  useEffect(() => {
    if (count <= 1 || paused || reducedMotion) return
    const id = window.setTimeout(() => setActive((value) => (value + 1) % count), AUTOPLAY_MS)
    return () => window.clearTimeout(id)
  }, [active, count, paused, reducedMotion])

  if (!current) return null
  const price = current.isOnSale && current.salePrice ? current.salePrice : current.price

  return (
    <section
      className={`store-section bg-surface-2 text-foreground ${isDark ? "dark" : ""}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="store-gutter mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <h2 className="store-heading">{title}</h2>
          <div className="mt-3 h-1 w-12 bg-[#E31C23]" />
          <p className="mt-3 inline-flex items-center gap-2 font-montserrat text-sm text-[var(--text-secondary)]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#E31C23] motion-safe:animate-pulse" />
            {total} {countLabel}
          </p>
        </div>
        <Link
          href="/lanzamientos"
          className="inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-bold uppercase tracking-[0.12em] text-[#1C1C1C] underline-offset-8 hover:underline dark:text-white"
        >
          Ver todos
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>

      <div className="store-gutter grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-6">
        {/* Escenario del drop activo */}
        <Link
          href={`/productos/${current.slug}`}
          className={`group relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-[var(--store-radius-xl)] ${SURFACE} ring-1 ring-black/[0.04] lg:min-h-[34rem]`}
          data-testid="launch-stage"
          aria-label={`Ver lanzamiento ${current.name}`}
        >
          <div className="relative z-10 flex items-start justify-between p-5 md:p-7">
            <p className="font-barlow text-xs font-bold uppercase tracking-[0.22em] text-[#1C1C1C]/50">
              Drop <span className="text-[#E31C23]">{pad(active + 1)}</span> / {pad(count)}
            </p>
            {current.videoUrl && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 font-barlow text-[10px] font-bold uppercase tracking-[0.14em] text-[#1C1C1C] ring-1 ring-black/10 backdrop-blur">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                En movimiento
              </span>
            )}
          </div>

          {/* El producto ocupa el espacio libre entre la cabecera y el texto: nunca queda debajo del título. */}
          <div className="relative -my-4 min-h-[13rem] flex-1 md:-my-6 md:min-h-[18rem] lg:min-h-[20rem]">
            <StageMedia product={current} />
          </div>

          <div key={current.id} className="relative flex flex-wrap items-end justify-between gap-4 p-5 motion-safe:animate-[hero-copy-swap_500ms_cubic-bezier(.22,1,.36,1)] md:p-7">
            <div className="min-w-0 max-w-lg">
              <p className="store-eyebrow mb-2">{current.brand}</p>
              <h3 className="line-clamp-3 font-barlow text-3xl font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#1C1C1C] [overflow-wrap:anywhere] md:text-4xl xl:text-5xl">
                {current.name}
              </h3>
              <p className="mt-3 flex items-baseline gap-2 font-barlow text-xl font-bold text-[#1C1C1C]">
                {formatPrice(price)}
                {current.isOnSale && current.salePrice && (
                  <span className="font-montserrat text-sm font-normal text-[#1C1C1C]/50 line-through">{formatPrice(current.price)}</span>
                )}
              </p>
            </div>
            <span className="inline-flex min-h-12 items-center gap-2 rounded-[var(--store-radius-md)] bg-[#1C1C1C] px-5 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors group-hover:bg-[#E31C23]">
              Ver lanzamiento
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </Link>

        {/* Lista de drops: elegir uno lo lleva al escenario. Fila deslizable en móvil, columna en escritorio. */}
        <ol className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0" aria-label="Lanzamientos">
          {products.map((product, index) => {
            const selected = index === active
            const itemPrice = product.isOnSale && product.salePrice ? product.salePrice : product.price
            return (
              <li key={product.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-pressed={selected}
                  aria-label={`Ver ${product.name} en el escenario`}
                  className={`relative flex w-full items-center gap-4 overflow-hidden rounded-[var(--store-radius-lg)] p-3 text-left transition-[background-color,box-shadow] duration-300 ${
                    selected ? "bg-white shadow-[0_14px_30px_-20px_rgb(28_28_28/0.4)] ring-1 ring-black/[0.06]" : "bg-transparent hover:bg-white/60"
                  }`}
                >
                  <span aria-hidden="true" className={`absolute inset-y-3 left-0 w-1 rounded-full transition-colors ${selected ? "bg-[#E31C23]" : "bg-transparent"}`} />
                  <span className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--store-radius-md)] ${SURFACE}`}>
                    <SafeImage src={product.imageUrl} alt="" sizes="80px" className="scale-[1.15] object-contain mix-blend-multiply" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-barlow text-[11px] font-bold uppercase tracking-[0.18em] ${selected ? "text-[#E31C23]" : "text-[#1C1C1C]/45"}`}>
                      {pad(index + 1)} · {product.brand}
                    </span>
                    <span className="mt-1 line-clamp-2 block font-barlow text-base font-bold uppercase leading-tight text-[#1C1C1C]">{product.name}</span>
                    <span className="mt-1 flex items-center gap-2 font-montserrat text-sm text-[#1C1C1C]/70">
                      {formatPrice(itemPrice)}
                      {product.videoUrl && <span className="font-barlow text-[10px] font-bold uppercase tracking-[0.14em] text-[#1C1C1C]/45">· Video</span>}
                    </span>
                  </span>
                  {/* Progreso del autoplay en el drop activo. */}
                  {selected && count > 1 && !reducedMotion && (
                    <span aria-hidden="true" className="absolute inset-x-3 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-black/[0.06]">
                      <span
                        key={`${product.id}-${active}`}
                        className="block h-full origin-left bg-[#E31C23] motion-safe:animate-[hero-progress_linear_both]"
                        style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                      />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
