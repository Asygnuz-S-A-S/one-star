"use client"

import { useState, useCallback, useRef } from "react"
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
  const [hoverFrame, setHoverFrame] = useState<number | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const touchStart = useRef<number | null>(null)

  const hasVideo = Boolean(videoUrl)
  const total = images.length
  const visibleIndex = hoverFrame ?? activeIndex

  const select = useCallback((index: number) => {
    if (total === 0) return
    const next = (index + total) % total
    setDirection(next >= activeIndex ? 1 : -1)
    setActiveIndex(next)
    setShowVideo(false)
  }, [activeIndex, total])

  // Con mouse, recorrer la foto de izquierda a derecha la hace "girar" entre ángulos.
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (showVideo || total <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    const frame = Math.floor(x * total)
    if (frame !== visibleIndex) setDirection(frame > visibleIndex ? 1 : -1)
    setHoverFrame(frame)
  }, [showVideo, total, visibleIndex])

  // Producto sin fotos cargadas: imagen predeterminada de la tienda.
  if (total === 0 && !hasVideo) {
    return (
      <div className={`relative aspect-square overflow-hidden rounded-store-xl ${STAGE}`}>
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
    <div className="flex min-w-0 flex-col-reverse gap-3 lg:flex-row lg:gap-4">
      {/* Miniaturas: fila deslizable en móvil, columna pegada a la foto en escritorio. */}
      <div className="-mx-4 min-w-0 px-4 lg:mx-0 lg:px-0">
        <div className="flex snap-x gap-2 overflow-x-auto pb-1 scrollbar-hide lg:max-h-[620px] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible" role="tablist" aria-label="Fotos del producto">
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
                className={`relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-store-md transition-[opacity,box-shadow] duration-200 lg:h-[72px] lg:w-[72px] ${STAGE} ${
                  active ? "opacity-100 shadow-[0_6px_16px_rgb(28_28_28/0.10)]" : "opacity-45 hover:opacity-100"
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
        className="group relative aspect-square min-w-0 flex-1 overflow-hidden rounded-store-xl bg-white border border-gray-200/80 shadow-sm dark:border-white/10 dark:bg-white/5"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverFrame(null)}
        onTouchStart={(e) => { touchStart.current = e.changedTouches[0]?.clientX ?? null }}
        onTouchEnd={(e) => {
          const end = e.changedTouches[0]?.clientX
          if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 40) select(activeIndex + (end < touchStart.current ? 1 : -1))
          touchStart.current = null
        }}
        style={{ "--frame-dir": direction } as React.CSSProperties}
      >
        {showVideo && videoUrl ? (
          <video src={videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
        ) : (
          <>
            {/* Contenedor con difuminado radial mask-image para fundir bordes de fotos de estudio no perfectamente blancas */}
            <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_92%_88%_at_50%_50%,black_80%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_92%_88%_at_50%_50%,black_80%,transparent_100%)]">
              {images.map((img, idx) => (
                <Image
                  key={img.id}
                  src={img.url}
                  alt={img.alt || `Vista ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  className={`object-contain object-center scale-[1.3] mix-blend-multiply dark:mix-blend-normal ${
                    idx === visibleIndex ? "opacity-100 motion-safe:animate-[card-frame-in_320ms_cubic-bezier(.22,1,.36,1)]" : "opacity-0"
                  }`}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                />
              ))}
            </div>

            {/* Sombra de contacto: el tenis "apoya" sobre la superficie. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[24%] bottom-[22%] h-6 rounded-[50%] bg-black/10 blur-xl" />

            {total > 1 && (
              <div className="absolute inset-x-4 bottom-3 flex items-center justify-between text-store-ink">
                <div className="flex items-center gap-3 font-barlow text-xs font-semibold tabular-nums tracking-[0.12em]">
                  <span>{pad(visibleIndex + 1)}</span>
                  <span aria-hidden="true" className="relative h-0.5 w-16 overflow-hidden rounded-full bg-store-ink/15">
                    <span className="absolute inset-y-0 left-0 bg-store-ink transition-[width] duration-300" style={{ width: `${((visibleIndex + 1) / total) * 100}%` }} />
                  </span>
                  <span className="opacity-50">{pad(total)}</span>
                </div>
                <div className="flex items-center">
                  <button type="button" onClick={() => select(activeIndex - 1)} className="grid h-11 w-11 place-items-center rounded-full opacity-70 transition hover:bg-white/70 hover:opacity-100" aria-label="Foto anterior">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                  </button>
                  <button type="button" onClick={() => select(activeIndex + 1)} className="grid h-11 w-11 place-items-center rounded-full opacity-70 transition hover:bg-white/70 hover:opacity-100" aria-label="Foto siguiente">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
