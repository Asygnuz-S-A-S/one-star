"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import type { BannerDTO } from "@/server/services/banner.service"
import { safePublicUrl } from "@/lib/safe-url"
import { canUseNextImageOptimization } from "@/lib/image-optimization"

// ─── Content position helpers ─────────────────────────────────────────────────
const POSITION_CLASSES: Record<string, string> = {
  "top-left":      "justify-start items-start pt-20 pb-0 px-6 md:px-16",
  "top-center":    "justify-start items-center pt-20 pb-0 px-6 md:px-16",
  "top-right":     "justify-start items-end pt-20 pb-0 px-6 md:px-16",
  "center-left":   "justify-center items-start px-6 md:px-16",
  "center":        "justify-center items-center px-6 md:px-16",
  "center-right":  "justify-center items-end px-6 md:px-16",
  "bottom-left":   "justify-end items-start pb-16 px-6 md:px-16 lg:px-24",
  "bottom-center": "justify-end items-center pb-16 px-6 md:px-16",
  "bottom-right":  "justify-end items-end pb-16 px-6 md:px-16",
}

const CTA_STYLES: Record<string, string> = {
  white:   "bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20 hover:text-white rounded-full",
  red:     "bg-[#E31C23] text-white hover:bg-[#c01018] rounded-full",
  outline: "bg-transparent text-white border border-white/50 hover:bg-white hover:text-[#1C1C1C] rounded-full",
  black:   "bg-[#1C1C1C]/50 backdrop-blur-md text-white border border-white/10 hover:bg-[#E31C23] rounded-full",
}

const TEXT_ALIGN: Record<string, string> = {
  "top-left":      "text-left",
  "top-center":    "text-center",
  "top-right":     "text-right",
  "center-left":   "text-left",
  "center":        "text-center",
  "center-right":  "text-right",
  "bottom-left":   "text-left",
  "bottom-center": "text-center",
  "bottom-right":  "text-right",
}

const FALLBACK_BANNER: BannerDTO = {
  id: "fallback-hero",
  title: "Nuevos lanzamientos",
  imageUrl: "",
  mediaType: "image",
  linkUrl: "/productos",
  position: 0,
  isActive: true,
  startDate: null,
  endDate: null,
  createdAt: "",
}

export default function HeroBanner({
  banners,
  config = {},
  isFirst = false,
  isBannerActive = true,
}: {
  banners: BannerDTO[]
  config?: Record<string, unknown>
  isFirst?: boolean
  isBannerActive?: boolean
}) {
  const heroBanners = banners.length > 0 ? banners : [FALLBACK_BANNER]
  const [current, setCurrent] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioningRef = useRef(false)
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set())


  // Config options
  const height         = (config.height as string)         || "85vh"
  const overlayOpacity = (config.overlayOpacity as number) ?? 0.4
  const contentPos     = (config.contentPosition as string)|| "bottom-left"
  const ctaText        = (config.ctaText as string)        || "Ver Detalles"
  const ctaStyle       = (config.ctaStyle as string)       || "white"
  const autoplayMs     = (config.autoplayMs as number)     || 5000
  const showDots       = config.showDots   !== false

  const positionCls = POSITION_CLASSES[contentPos] ?? POSITION_CLASSES["bottom-left"]
  const ctaCls      = CTA_STYLES[ctaStyle]           ?? CTA_STYLES["white"]
  const textAlign   = TEXT_ALIGN[contentPos]          ?? "text-left"

  const goTo = useCallback((index: number) => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    setCurrent(index)
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
    transitionTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false
      transitionTimeoutRef.current = null
    }, 400)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % heroBanners.length)
    }, autoplayMs)
    return () => clearInterval(timer)
  }, [autoplayMs, current, goTo, heroBanners.length])

  useEffect(() => () => {
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current)
  }, [])

  const visibleIndex = Math.min(current, heroBanners.length - 1)
  const banner = heroBanners[visibleIndex]
  const bannerTitle = banner.title.trim() || FALLBACK_BANNER.title

  const negativeMargin = isFirst 
    ? (isBannerActive ? "-mt-[88px] lg:-mt-[96px]" : "-mt-[56px] lg:-mt-[64px]") 
    : ""

  return (
    <section 
      ref={containerRef}
      className={`relative w-full ${!isFirst ? "h-[60vh] md:h-[70vh]" : ""} ${negativeMargin} overflow-hidden bg-[#1C1C1C]`}
      style={isFirst ? { height } : undefined}
      data-testid="home-hero"
    >
      {/* Background Media */}
      {heroBanners.map((b, i) => {
        const mediaUrl = safePublicUrl(b.imageUrl, "/placeholder-product.svg")
        const shouldShowMedia = !failedMedia.has(b.id) && b.imageUrl.trim().length > 0

        return (
          <div
            key={b.id}
            className="absolute inset-0 bg-[linear-gradient(135deg,#1C1C1C_0%,#373737_55%,#E31C23_180%)] transition-opacity duration-700"
            style={{ opacity: i === visibleIndex ? 1 : 0 }}
            data-testid={i === visibleIndex ? "hero-media" : undefined}
          >
            {shouldShowMedia && b.mediaType === "video" ? (
              <video
                src={mediaUrl}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                onError={() => setFailedMedia((currentFailed) => new Set(currentFailed).add(b.id))}
              />
            ) : shouldShowMedia ? (
              <Image
                src={mediaUrl}
                alt={b.title}
                fill
                priority={i === 0}
                unoptimized={!canUseNextImageOptimization(mediaUrl)}
                className="object-cover object-center"
                sizes="100vw"
                onError={() => setFailedMedia((currentFailed) => new Set(currentFailed).add(b.id))}
              />
            ) : null}
          </div>
        )
      })}

      {/* Overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
      />

      {/* Decorative background text stays visible without JavaScript. */}
      <div
        className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none select-none overflow-hidden mix-blend-overlay"
      >
        <span className="text-white/5 font-barlow font-black text-[25vw] tracking-tighter whitespace-nowrap">
          ONE STAR
        </span>
      </div>

      {/* Content */}
      <div className={`relative z-20 h-full flex flex-col ${positionCls}`}>
        <div key={`content-${banner.id}`} className={`max-w-2xl ${textAlign}`}>
            <h1 className="flex flex-col gap-4 mb-8">
              {bannerTitle.split("\n").map((line, lineIndex) => (
                <div key={lineIndex} className="overflow-hidden">
                  <span
                    className={`block ${
                      lineIndex === 0 
                        ? "text-white font-barlow font-black uppercase text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter" 
                        : "text-white font-montserrat font-medium text-sm md:text-lg tracking-wide"
                    }`}
                    style={lineIndex === 0 ? { textShadow: "0 4px 40px rgba(0,0,0,0.5)" } : { textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
                  >
                    {line}
                  </span>
                </div>
              ))}
            </h1>
            
            <div>
              <Link
                href={safePublicUrl(banner.linkUrl, "/productos")}
                className={`inline-flex items-center gap-4 font-montserrat font-bold text-xs md:text-sm tracking-widest px-8 py-4 transition-colors duration-300 ${ctaCls}`}
              >
                {ctaText}
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50" />
              </Link>
            </div>
          </div>

        {/* Scroll Indicator */}
        {isFirst && (
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50"
          >
            <span className="text-[10px] uppercase tracking-widest mb-2 font-bold">Scroll</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
          </div>
        )}

        {/* Dots / Progress Indicator */}
        {showDots && heroBanners.length > 1 && (
          <div className="absolute bottom-10 left-6 md:left-16 z-30 flex gap-2">
            {heroBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === visibleIndex ? "w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "w-6 bg-white/30 hover:bg-white/50"}`}
                aria-label={`Ir al banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
