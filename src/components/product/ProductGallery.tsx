"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Image from "next/image"
import type { ProductImage } from "@/types/shop"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"

interface ProductGalleryProps {
  images: ProductImage[]
  videoUrl?: string | null
}

const pad = (value: number) => String(value).padStart(2, "0")

export default function ProductGallery({ images, videoUrl }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  // Zoom con un clic: la foto se amplía y sigue al cursor; otro clic (o salir) la devuelve.
  const [zoomed, setZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%")
  const [direction, setDirection] = useState<1 | -1>(1)
  const touchStart = useRef<number | null>(null)
  const tablistRef = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)

  const hasVideo = Boolean(videoUrl)
  const total = images.length
  const visibleIndex = activeIndex

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    const list = tablistRef.current
    if (!list) return
    const activeTab = list.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!activeTab) return

    const listRect = list.getBoundingClientRect()
    const tabRect = activeTab.getBoundingClientRect()
    if (tabRect.top < listRect.top) {
      list.scrollBy({ top: tabRect.top - listRect.top - 4, behavior: "smooth" })
    } else if (tabRect.bottom > listRect.bottom) {
      list.scrollBy({ top: tabRect.bottom - listRect.bottom + 4, behavior: "smooth" })
    }
    if (tabRect.left < listRect.left) {
      list.scrollBy({ left: tabRect.left - listRect.left - 8, behavior: "smooth" })
    } else if (tabRect.right > listRect.right) {
      list.scrollBy({ left: tabRect.right - listRect.right + 8, behavior: "smooth" })
    }
  }, [activeIndex, showVideo])

  const select = useCallback((index: number) => {
    if (total === 0) return
    const next = (index + total) % total
    setDirection(next >= activeIndex ? 1 : -1)
    setZoomed(false)
    setActiveIndex(next)
    setShowVideo(false)
  }, [activeIndex, total])

  // En la ficha la foto ya no cambia al pasar el mouse (eso queda para las tarjetas del catálogo).
  // Un clic acerca la foto en el punto señalado; mover el mouse recorre la zona ampliada.
  const originFrom = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    return `${x}% ${y}%`
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (zoomed) setZoomOrigin(originFrom(e))
  }, [zoomed, originFrom])

  const toggleZoom = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (showVideo) return
    if ((e.target as HTMLElement | null)?.closest("button")) return
    setZoomOrigin(originFrom(e))
    setZoomed((value) => !value)
  }, [showVideo, originFrom])

  // Producto sin fotos cargadas: imagen predeterminada de la tienda.
  if (total === 0 && !hasVideo) {
    return (
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={PLACEHOLDER_IMAGE_URL}
          alt="Producto sin imagen disponible"
          fill
          priority
          className="object-contain object-center"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
      </div>
    )
  }

  return (
    // En escritorio la galería queda fija mientras se recorre la info de la derecha (antes quedaba un hueco blanco).
    // Se usa grid en `lg` con carril posicionado absoluto para que muchas miniaturas hagan scroll sin estirar el `aspect-[4/3]` de la foto principal.
    <div className="flex min-w-0 flex-col-reverse gap-3 lg:sticky lg:top-[calc(var(--public-header-offset-desktop,96px)+1.5rem)] lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-4 lg:self-start">
      {/* Miniaturas: fila deslizable en móvil, columna acotada al alto de la foto en escritorio. */}
      <div className="-mx-4 min-w-0 px-4 lg:relative lg:mx-0 lg:px-0">
        <div
          ref={tablistRef}
          className="flex snap-x gap-2 overflow-x-auto pb-1 scrollbar-hide lg:absolute lg:inset-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0"
          role="tablist"
          aria-label="Fotos del producto"
        >
          {images.map((img, idx) => {
            const active = !showVideo && activeIndex === idx
            return (
              <button
                key={img.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => select(idx)}
                // Activo: la miniatura se ilumina y una línea roja la marca; sin marco negro alrededor.
                className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-store-md border transition-[opacity,border-color] duration-200 lg:h-[72px] lg:w-[72px] ${
                  active ? "border-[#1C1C1C]/25 opacity-100 dark:border-white/30" : "border-transparent opacity-45 hover:opacity-100"
                }`}
                aria-label={img.alt || `Foto ${idx + 1}`}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-contain object-center scale-[1.35] mix-blend-multiply"
                  sizes="72px"
                />
                <span aria-hidden="true" className={`absolute bottom-1 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-store-action transition-[width] duration-200 ${active ? "w-6" : "w-0"}`} />
              </button>
            )
          })}

          {hasVideo && (
            <button
              type="button"
              role="tab"
              aria-selected={showVideo}
              onClick={() => setShowVideo(true)}
              className={`grid h-16 w-16 shrink-0 snap-start place-items-center rounded-store-md bg-store-surface-muted text-store-ink transition-opacity lg:h-[72px] lg:w-[72px] ${
                showVideo ? "opacity-100 text-store-action" : "opacity-60 hover:opacity-100"
              }`}
              aria-label="Ver video del producto"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Foto principal */}
      <div
        // Caja horizontal: las fotos de tenis son apaisadas y en un cuadrado sobraba espacio arriba y abajo.
        className={`group relative aspect-[5/4] w-full min-w-0 overflow-hidden lg:aspect-[4/3] ${showVideo ? "" : zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={toggleZoom}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoomed(false)}
        onTouchStart={(e) => { touchStart.current = e.changedTouches[0]?.clientX ?? null }}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientX
          // Con la foto ampliada, deslizar no cambia de foto.
          if (!zoomed && touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 40) select(activeIndex + (end < touchStart.current ? 1 : -1))
          touchStart.current = null
        }}
        data-zoomed={zoomed ? "true" : "false"}
        style={{ "--frame-dir": direction } as React.CSSProperties}
      >
        {showVideo && videoUrl ? (
          <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
        ) : (
          <>
            {/* Contenedor con difuminado radial mask-image para fundir bordes de fotos de estudio no perfectamente blancas */}
            <div
              className={`absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none ${zoomed ? "scale-[2.2]" : "scale-100"}`}
              style={{ transformOrigin: zoomOrigin }}
            >
            <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_92%_88%_at_50%_50%,black_80%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_92%_88%_at_50%_50%,black_80%,transparent_100%)]">
              {images.map((img, idx) => (
                <Image
                  key={img.id}
                  src={img.url}
                  alt={img.alt || `Vista ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  className={`object-contain object-center scale-105 mix-blend-multiply dark:mix-blend-normal ${
                    idx === visibleIndex ? "opacity-100 motion-safe:animate-[card-frame-in_320ms_cubic-bezier(.22,1,.36,1)]" : "opacity-0"
                  }`}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              ))}
            </div>
            </div>

            {/* Sombra de contacto: el tenis "apoya" sobre la superficie. */}
            <div aria-hidden="true" className={`pointer-events-none absolute inset-x-[24%] bottom-[16%] h-6 rounded-[50%] bg-black/10 blur-xl transition-opacity ${zoomed ? "opacity-0" : "opacity-100"}`} />

            {/* Flechas de navegación laterales sutiles pero grandecitas */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => select(activeIndex - 1)}
                  className="absolute left-2.5 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-store-ink shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white active:scale-95 dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
                  aria-label="Foto anterior"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => select(activeIndex + 1)}
                  className="absolute right-2.5 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-store-ink shadow-sm backdrop-blur transition-all hover:scale-105 hover:bg-white active:scale-95 dark:bg-black/60 dark:text-white dark:hover:bg-black/80"
                  aria-label="Foto siguiente"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
