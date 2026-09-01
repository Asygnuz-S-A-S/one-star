"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "motion/react"

export interface MediaSlide {
  id: string
  mediaType: "image" | "video"
  imageUrl?: string
  mobileImageUrl?: string
  videoUrl?: string
  posterUrl?: string
  badge?: string
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  contentPosition?: "center" | "left" | "right" | "bottom-left" | "bottom-center"
  overlayOpacity?: number // 0 to 100
  textColor?: "light" | "dark"
}

export interface MediaCarouselConfig {
  title?: string
  subtitle?: string
  layout?: "full-width" | "container" | "card"
  height?: "small" | "medium" | "large" | "screen" | "auto"
  aspectRatio?: "16/9" | "21/9" | "4/3" | "auto"
  marginTop?: "none" | "sm" | "md" | "lg" | "xl"
  marginBottom?: "none" | "sm" | "md" | "lg" | "xl"
  autoplay?: boolean
  autoplayInterval?: number
  showArrows?: boolean
  showDots?: boolean
  animation?: "slide" | "fade"
  items?: MediaSlide[]
}

interface MediaCarouselProps {
  config?: Record<string, unknown>
}

const DEFAULT_SLIDES: MediaSlide[] = [
  {
    id: "default-slide-1",
    mediaType: "image",
    imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1920&auto=format&fit=crop",
    badge: "NUEVA TEMPORADA",
    title: "ESTILO URBANO SIN LÍMITES",
    subtitle: "Descubre los últimos lanzamientos de zapatillas y accesorios diseñados para destacar en la calle.",
    ctaText: "VER COLECCIÓN",
    ctaLink: "/productos",
    contentPosition: "bottom-left",
    overlayOpacity: 45,
    textColor: "light",
  },
]

export default function MediaCarousel({ config = {} }: MediaCarouselProps) {
  const cfg = config as MediaCarouselConfig
  const rawItems = Array.isArray(cfg.items) && cfg.items.length > 0 ? cfg.items : DEFAULT_SLIDES
  
  // Normalizar items
  const items: MediaSlide[] = rawItems.map((item, idx) => ({
    id: item.id || `slide-${idx}`,
    mediaType: item.mediaType || "image",
    imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1920&auto=format&fit=crop",
    mobileImageUrl: item.mobileImageUrl,
    videoUrl: item.videoUrl,
    posterUrl: item.posterUrl,
    badge: item.badge,
    title: item.title,
    subtitle: item.subtitle,
    ctaText: item.ctaText,
    ctaLink: item.ctaLink,
    secondaryCtaText: item.secondaryCtaText,
    secondaryCtaLink: item.secondaryCtaLink,
    contentPosition: item.contentPosition || "bottom-left",
    overlayOpacity: typeof item.overlayOpacity === "number" ? item.overlayOpacity : 40,
    textColor: item.textColor || "light",
  }))

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [direction, setDirection] = useState<1 | -1>(1)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const isMultiSlide = items.length > 1
  const autoplay = cfg.autoplay ?? true
  const intervalSeconds = (cfg.autoplayInterval && cfg.autoplayInterval >= 2) ? cfg.autoplayInterval : 6
  const showArrows = (cfg.showArrows ?? true) && isMultiSlide
  const showDots = (cfg.showDots ?? true) && isMultiSlide
  const layout = cfg.layout || "full-width"
  const heightPreset = cfg.height || "medium"
  const animationType = cfg.animation || "slide"

  // Altura del banner
  const getHeightClasses = () => {
    switch (heightPreset) {
      case "small":
        return "min-h-[340px] md:min-h-[400px] h-[400px]"
      case "large":
        return "min-h-[550px] md:min-h-[700px] h-[700px]"
      case "screen":
        return "min-h-[80vh] md:min-h-[90vh] h-[90vh]"
      case "auto":
        return "aspect-[16/9] md:aspect-[21/9]"
      case "medium":
      default:
        return "min-h-[440px] md:min-h-[540px] h-[540px]"
    }
  }

  const nextSlide = useCallback(() => {
    setDirection(1)
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  const prevSlide = useCallback(() => {
    setDirection(-1)
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

  // Autoplay
  useEffect(() => {
    if (!autoplay || isPaused || !isMultiSlide) return
    const timer = setInterval(() => {
      nextSlide()
    }, intervalSeconds * 1000)
    return () => clearInterval(timer)
  }, [autoplay, isPaused, isMultiSlide, intervalSeconds, nextSlide])

  // Gestos táctiles
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
    touchStartX.current = null
    touchEndX.current = null
  }

  const currentSlide = items[currentIndex] || items[0]

  // Posición del contenido
  const getPositionClasses = (pos?: string) => {
    switch (pos) {
      case "center":
        return "items-center justify-center text-center"
      case "right":
        return "items-end justify-center text-right"
      case "bottom-center":
        return "items-center justify-end text-center pb-12 md:pb-16"
      case "left":
        return "items-start justify-center text-left"
      case "bottom-left":
      default:
        return "items-start justify-end text-left pb-12 md:pb-16"
    }
  }

  const marginTop = typeof cfg.marginTop === "string" ? cfg.marginTop : "md"
  const marginBottom = typeof cfg.marginBottom === "string" ? cfg.marginBottom : "none"

  const getMarginTopClass = () => {
    switch (marginTop) {
      case "none": return "mt-0"
      case "sm": return "mt-4 md:mt-6"
      case "md": return "mt-8 md:mt-12"
      case "lg": return "mt-12 md:mt-16"
      case "xl": return "mt-16 md:mt-24"
      default: return "mt-8 md:mt-12"
    }
  }

  const getMarginBottomClass = () => {
    switch (marginBottom) {
      case "none": return "mb-0"
      case "sm": return "mb-4 md:mb-6"
      case "md": return "mb-8 md:mb-12"
      case "lg": return "mb-12 md:mb-16"
      case "xl": return "mb-16 md:mb-24"
      default: return "mb-0"
    }
  }

  return (
    <section 
      className={`relative w-full overflow-hidden ${getMarginTopClass()} ${getMarginBottomClass()} ${
        layout === "container" ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : 
        layout === "card" ? "max-w-6xl mx-auto px-4 rounded-2xl overflow-hidden shadow-2xl" : 
        ""
      }`}
      aria-label={cfg.title || "Carrusel de promociones y novedades"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Título de sección opcional */}
      {(cfg.title || cfg.subtitle) && (
        <div className="mb-6 text-center md:text-left px-4 max-w-7xl mx-auto">
          {cfg.title && (
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white font-[var(--font-barlow)]">
              {cfg.title}
            </h2>
          )}
          {cfg.subtitle && (
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
              {cfg.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Contenedor del Carrusel */}
      <div className={`relative w-full ${getHeightClasses()} ${layout === "card" ? "rounded-2xl" : ""} overflow-hidden bg-gray-900`}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={`slide-${currentIndex}-${currentSlide.id || 'item'}`}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: animationType === "fade" ? 0 : dir > 0 ? "100%" : "-100%",
                opacity: animationType === "fade" ? 0 : 1,
                scale: animationType === "fade" ? 1.04 : 1,
                zIndex: 2,
              }),
              center: {
                x: 0,
                opacity: 1,
                scale: 1,
                zIndex: 2,
                transition: {
                  x: { type: "spring", stiffness: 260, damping: 32 },
                  opacity: { duration: 0.45 },
                  scale: { duration: 0.5 },
                },
              },
              exit: (dir: number) => ({
                x: animationType === "fade" ? 0 : dir > 0 ? "-35%" : "35%",
                opacity: animationType === "fade" ? 0 : 0.3,
                scale: animationType === "fade" ? 0.97 : 0.94,
                zIndex: 1,
                transition: {
                  x: { type: "spring", stiffness: 260, damping: 32 },
                  opacity: { duration: 0.45 },
                  scale: { duration: 0.5 },
                },
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full will-change-transform"
          >
            {/* Background Media: Video o Imagen */}
            {currentSlide.mediaType === "video" && currentSlide.videoUrl ? (
              <video
                key={currentSlide.videoUrl}
                src={currentSlide.videoUrl}
                poster={currentSlide.posterUrl || currentSlide.imageUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              />
            ) : (
              <div className="relative w-full h-full">
                {/* Imagen de fondo */}
                <Image
                  src={currentSlide.imageUrl || "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1920&auto=format&fit=crop"}
                  alt={currentSlide.title || "Promoción One Star"}
                  fill
                  priority={currentIndex === 0}
                  className="object-cover object-center select-none pointer-events-none"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px"
                />
              </div>
            )}

            {/* Capa de Sombreado / Overlay Gradiente */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none z-[5]"
              style={{
                opacity: (currentSlide.overlayOpacity ?? 40) / 100,
              }}
            />

            {/* Contenido / Textos y Botones */}
            <div className={`relative z-10 w-full h-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col pointer-events-none ${getPositionClasses(currentSlide.contentPosition)}`}>
              <motion.div 
                variants={{
                  enter: { opacity: 0, y: 24 },
                  center: { 
                    opacity: 1, 
                    y: 0, 
                    transition: { duration: 0.45, delay: 0.15, ease: "easeOut" } 
                  },
                  exit: { 
                    opacity: 0, 
                    y: -10, 
                    transition: { duration: 0.2 } 
                  },
                }}
                className={`max-w-2xl pointer-events-auto ${currentSlide.textColor === "dark" ? "text-gray-900" : "text-white"}`}
              >
                {/* Badge / Etiqueta */}
                {currentSlide.badge && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {currentSlide.badge}
                  </div>
                )}

                {/* Título Principal */}
                {currentSlide.title && (
                  <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[1.05] font-[var(--font-barlow)] drop-shadow-md">
                    {currentSlide.title}
                  </h3>
                )}

                {/* Subtítulo / Descripción */}
                {currentSlide.subtitle && (
                  <p className="mt-3 text-sm sm:text-base md:text-lg text-white/90 font-medium leading-relaxed drop-shadow max-w-xl">
                    {currentSlide.subtitle}
                  </p>
                )}

                {/* Botones de Llamada a la Acción (CTAs) */}
                {(currentSlide.ctaText || currentSlide.secondaryCtaText) && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {currentSlide.ctaText && currentSlide.ctaLink && (
                      <Link
                        href={currentSlide.ctaLink}
                        className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-white text-black hover:bg-black hover:text-white border-2 border-white text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all duration-300 transform active:scale-95 shadow-lg group pointer-events-auto cursor-pointer"
                      >
                        <span>{currentSlide.ctaText}</span>
                        <svg className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    )}

                    {currentSlide.secondaryCtaText && currentSlide.secondaryCtaLink && (
                      <Link
                        href={currentSlide.secondaryCtaLink}
                        className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/40 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 pointer-events-auto cursor-pointer"
                      >
                        {currentSlide.secondaryCtaText}
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Flechas de Navegación */}
        {showArrows && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Diapositiva anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={nextSlide}
              aria-label="Siguiente diapositiva"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Indicadores de Puntos (Dots) / Barra de Progreso */}
        {showDots && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/15">
            {items.map((slide, idx) => (
              <button
                key={slide.id || idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1)
                  setCurrentIndex(idx)
                }}
                aria-label={`Ir a diapositiva ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex 
                    ? "w-8 h-2 bg-white" 
                    : "w-2 h-2 bg-white/40 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
