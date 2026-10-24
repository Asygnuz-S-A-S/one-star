"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { getImageProps } from "next/image"
import { motion, AnimatePresence } from "motion/react"
import { canUseNextImageOptimization } from "@/lib/image-optimization"

export type MediaFocalPoint = "center" | "top" | "bottom" | "left" | "right"

export interface MediaSlide {
  id: string
  mediaType: "image" | "video"
  imageUrl?: string
  /** Se usa por debajo de 768px (celulares). */
  mobileImageUrl?: string
  /** Qué parte de la foto se conserva cuando el banner la recorta. */
  focalPoint?: MediaFocalPoint
  mobileFocalPoint?: MediaFocalPoint
  videoUrl?: string
  posterUrl?: string
  badge?: string
  title?: string
  subtitle?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  /** Posición del texto desde 768px; en celulares manda `mobileContentPosition` si existe. */
  contentPosition?: "center" | "left" | "right" | "bottom-left" | "bottom-center"
  mobileContentPosition?: "center" | "left" | "right" | "bottom-left" | "bottom-center"
  overlayOpacity?: number // 0 to 100
  textColor?: "light" | "dark"
}

export interface MediaCarouselConfig {
  title?: string
  subtitle?: string
  layout?: "full-width" | "container" | "card"
  /** "fit" sigue la proporción recomendada de las fotos: 1920×600 en escritorio y 1080×1080 en móvil. */
  height?: "fit" | "small" | "medium" | "large" | "screen" | "auto"
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

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1920&auto=format&fit=crop"

const FOCAL_CLASSES: Record<MediaFocalPoint, string> = {
  center: "object-center",
  top: "object-top",
  bottom: "object-bottom",
  left: "object-left",
  right: "object-right",
}

const DESKTOP_FOCAL_CLASSES: Record<MediaFocalPoint, string> = {
  center: "md:object-center",
  top: "md:object-top",
  bottom: "md:object-bottom",
  left: "md:object-left",
  right: "md:object-right",
}

type ContentPosition = NonNullable<MediaSlide["contentPosition"]>

const toContentPosition = (value: unknown): ContentPosition =>
  typeof value === "string" && value in POSITION_CLASSES ? (value as ContentPosition) : "bottom-left"

// Clases literales por breakpoint para que Tailwind las detecte. El velo oscuro se coloca del lado del texto.
const POSITION_CLASSES: Record<ContentPosition, { box: string; cta: string; veil: string }> = {
  "bottom-left": { box: "items-start justify-end text-left pb-12", cta: "justify-start", veil: "bg-gradient-to-t" },
  "bottom-center": { box: "items-center justify-end text-center pb-12", cta: "justify-center", veil: "bg-gradient-to-t" },
  left: { box: "items-start justify-center text-left pb-0", cta: "justify-start", veil: "bg-gradient-to-r" },
  center: { box: "items-center justify-center text-center pb-0", cta: "justify-center", veil: "bg-gradient-to-t" },
  right: { box: "items-end justify-center text-right pb-0", cta: "justify-end", veil: "bg-gradient-to-l" },
}

const MD_POSITION_CLASSES: Record<ContentPosition, { box: string; cta: string; veil: string }> = {
  "bottom-left": { box: "md:items-start md:justify-end md:text-left md:pb-16", cta: "md:justify-start", veil: "md:bg-gradient-to-t" },
  "bottom-center": { box: "md:items-center md:justify-end md:text-center md:pb-16", cta: "md:justify-center", veil: "md:bg-gradient-to-t" },
  left: { box: "md:items-start md:justify-center md:text-left md:pb-0", cta: "md:justify-start", veil: "md:bg-gradient-to-r" },
  center: { box: "md:items-center md:justify-center md:text-center md:pb-0", cta: "md:justify-center", veil: "md:bg-gradient-to-t" },
  right: { box: "md:items-end md:justify-center md:text-right md:pb-0", cta: "md:justify-end", veil: "md:bg-gradient-to-l" },
}

const focal = (value: unknown): MediaFocalPoint =>
  typeof value === "string" && value in FOCAL_CLASSES ? (value as MediaFocalPoint) : "center"

/** Dirección de arte: el navegador descarga solo la foto que corresponde al ancho de pantalla. */
function SlideImage({ slide, priority }: { slide: MediaSlide; priority: boolean }) {
  const desktopSrc = slide.imageUrl || FALLBACK_IMAGE
  const mobileSrc = slide.mobileImageUrl || desktopSrc
  const props = (src: string, width: number, height: number) => getImageProps({
    src, alt: slide.title || "Promoción One Star", width, height, sizes: "100vw",
    fetchPriority: priority ? "high" : "auto",
    unoptimized: !canUseNextImageOptimization(src),
  }).props
  const desktop = props(desktopSrc, 1920, 600)
  const mobile = props(mobileSrc, 1080, 1080)
  const mobileFocal = slide.mobileImageUrl ? focal(slide.mobileFocalPoint) : focal(slide.focalPoint)

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet ?? desktop.src} sizes="100vw" />
      <img
        {...mobile}
        alt={mobile.alt}
        loading={priority ? "eager" : "lazy"}
        className={`absolute inset-0 h-full w-full select-none object-cover pointer-events-none ${FOCAL_CLASSES[mobileFocal]} ${DESKTOP_FOCAL_CLASSES[focal(slide.focalPoint)]}`}
      />
    </picture>
  )
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
    imageUrl: item.imageUrl || FALLBACK_IMAGE,
    mobileImageUrl: item.mobileImageUrl,
    focalPoint: item.focalPoint,
    mobileFocalPoint: item.mobileFocalPoint,
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
    mobileContentPosition: item.mobileContentPosition,
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
      case "fit":
        // Móvil cuadrado (1080×1080); desde md el panorámico 1920×600 con un mínimo de alto para el texto.
        return "aspect-square md:aspect-[16/5] md:min-h-[320px] lg:min-h-[380px]"
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

  const mobilePosition = toContentPosition(currentSlide.mobileContentPosition ?? currentSlide.contentPosition)
  const desktopPosition = toContentPosition(currentSlide.contentPosition)

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
            <h2 className="store-heading">
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
              <div className="absolute inset-0">
                <SlideImage slide={currentSlide} priority={currentIndex === 0} />
              </div>
            )}

            {/* Capa de Sombreado / Overlay Gradiente */}
            <div 
              className={`absolute inset-0 from-black/90 via-black/45 to-transparent pointer-events-none z-[5] ${POSITION_CLASSES[mobilePosition].veil} ${MD_POSITION_CLASSES[desktopPosition].veil}`}
              style={{
                opacity: (currentSlide.overlayOpacity ?? 40) / 100,
              }}
            />

            {/* Contenido / Textos y Botones */}
            <div className={`relative z-10 w-full h-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col pointer-events-none ${POSITION_CLASSES[mobilePosition].box} ${MD_POSITION_CLASSES[desktopPosition].box}`}>
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
                  <h3 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[1.05] font-barlow drop-shadow-md">
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
                  <div className={`mt-6 flex flex-wrap items-center gap-3 ${POSITION_CLASSES[mobilePosition].cta} ${MD_POSITION_CLASSES[desktopPosition].cta}`}>
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
