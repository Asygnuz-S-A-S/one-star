"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import type { ProductImage } from "@/types/shop"

interface ProductGalleryProps {
  images: ProductImage[]
  videoUrl?: string | null
}

export default function ProductGallery({ images, videoUrl }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [hoverFrame, setHoverFrame] = useState<number | null>(null)

  const hasVideo = Boolean(videoUrl)
  const allImages = images.map(img => img.url)

  // Qué imagen mostrar: si hay hover frame activo lo usamos, si no el seleccionado
  const displayUrl = !showVideo && hoverFrame !== null
    ? allImages[hoverFrame] ?? allImages[activeIndex]
    : allImages[activeIndex]

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (showVideo || allImages.length <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
    setHoverFrame(Math.floor(x * allImages.length))
  }, [showVideo, allImages.length])

  const handleMouseLeave = useCallback(() => {
    setHoverFrame(null)
  }, [])

  if (images.length === 0 && !hasVideo) {
    return (
      <div className="aspect-square bg-[#F0F0F0] dark:bg-white/5 flex items-center justify-center rounded-2xl">
        <svg width="80" height="80" viewBox="0 0 64 64" fill="none" className="text-[#4A4A4A]/30">
          <path d="M8 40 C8 40 12 28 24 28 C30 28 34 32 40 32 C46 32 52 28 56 30 L56 42 C56 44 54 46 52 46 L12 46 C10 46 8 44 8 42 Z" fill="currentColor"/>
          <path d="M24 28 L20 18 L28 18 L32 28" fill="currentColor" opacity="0.6"/>
        </svg>
      </div>
    )
  }

  const activeImage = images[activeIndex]

  return (
    <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4">

      {/* Thumbnails verticales (derecha en mobile = abajo; izquierda en desktop) */}
      <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[580px] pb-1 scrollbar-hide md:w-20 shrink-0">
        {images.map((img, idx) => (
          <button
            key={img.id}
            onClick={() => { setActiveIndex(idx); setShowVideo(false) }}
            className={`relative shrink-0 w-16 h-16 md:w-20 md:h-20 bg-[#F0F0F0] dark:bg-white/5 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
              !showVideo && activeIndex === idx
                ? "border-[#1C1C1C] dark:border-white shadow-sm"
                : "border-transparent hover:border-[#4A4A4A]/50"
            }`}
            aria-label={img.alt || `Imagen ${idx + 1}`}
          >
            <Image
              src={img.url}
              alt={img.alt || `Miniatura ${idx + 1}`}
              fill
              className="object-cover object-center"
              sizes="80px"
            />
          </button>
        ))}

        {hasVideo && (
          <button
            onClick={() => setShowVideo(true)}
            className={`relative shrink-0 w-16 h-16 md:w-20 md:h-20 bg-[#1C1C1C] dark:bg-white/10 overflow-hidden rounded-xl border-2 transition-all duration-200 flex items-center justify-center ${
              showVideo ? "border-[#1C1C1C] dark:border-white" : "border-transparent hover:border-[#4A4A4A]/50"
            }`}
            aria-label="Ver video del producto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Imagen principal con animación 3D */}
      <div
        className="relative flex-1 aspect-square bg-[#F0F0F0] dark:bg-white/5 overflow-hidden rounded-2xl cursor-crosshair group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {showVideo && videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : activeImage ? (
          <>
            {/* Renderizamos todas las imágenes, mostramos la activa */}
            {allImages.map((url, idx) => (
              <Image
                key={`main-${idx}`}
                src={url}
                alt={images[idx]?.alt || `Vista ${idx + 1}`}
                fill
                priority={idx === 0}
                className={`object-contain object-center transition-opacity duration-100 ease-in-out ${
                  idx === (hoverFrame ?? activeIndex) ? "opacity-100" : "opacity-0"
                }`}
                sizes="(max-width: 768px) 100vw, 55vw"
              />
            ))}

            {/* Hint sutil de interacción (solo si hay más de 1 imagen) */}
            {allImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <span className="text-[10px] font-[var(--font-montserrat)] tracking-widest text-[#4A4A4A] dark:text-white/50 uppercase">
                  ← Mover para rotar →
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>

    </div>
  )
}
