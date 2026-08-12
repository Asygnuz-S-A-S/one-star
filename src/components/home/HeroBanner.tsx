"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react"
import { useRef } from "react"

import type { BannerDTO } from "@/server/services/banner.service"

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

export default function HeroBanner({
  banners,
  config = {},
  isFirst = false,
  isBannerActive = true,
}: {
  banners: BannerDTO[]
  config?: Record<string, any>
  isFirst?: boolean
  isBannerActive?: boolean
}) {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // El parallax basado en el ref del contenedor solo se activa tras montar:
  // durante la hidratación el elemento aún no existe y motion lanzaría
  // "Target ref is defined but not hydrated".
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { scrollYProgress } = useScroll({
    target: mounted ? containerRef : undefined,
    offset: ["start start", "end start"],
  })

  // Parallax transforms
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacityText = useTransform(scrollYProgress, [0, 1], [1, 0])


  // Config options
  const height         = (config.height as string)         || "85vh"
  const overlayOpacity = (config.overlayOpacity as number) ?? 0.4
  const contentPos     = (config.contentPosition as string)|| "bottom-left"
  const ctaText        = (config.ctaText as string)        || "Ver Detalles"
  const ctaStyle       = (config.ctaStyle as string)       || "white"
  const autoplayMs     = (config.autoplayMs as number)     || 5000
  const showArrows     = config.showArrows !== false
  const showDots       = config.showDots   !== false

  const positionCls = POSITION_CLASSES[contentPos] ?? POSITION_CLASSES["bottom-left"]
  const ctaCls      = CTA_STYLES[ctaStyle]           ?? CTA_STYLES["white"]
  const textAlign   = TEXT_ALIGN[contentPos]          ?? "text-left"

  useEffect(() => {
    if (banners.length === 0) return
    const timer = setInterval(() => {
      goTo((current + 1) % banners.length)
    }, autoplayMs)
    return () => clearInterval(timer)
  }, [current, banners.length, autoplayMs])

  function goTo(index: number) {
    if (isTransitioning || banners.length === 0) return
    setIsTransitioning(true)
    setCurrent(index)
    setTimeout(() => setIsTransitioning(false), 400)
  }

  if (banners.length === 0) return null

  const banner = banners[current]

  const negativeMargin = isFirst 
    ? (isBannerActive ? "-mt-[88px] md:-mt-[96px]" : "-mt-[56px] md:-mt-[64px]") 
    : ""

  return (
    <section 
      ref={containerRef}
      className={`relative w-full ${!isFirst ? "h-[60vh] md:h-[70vh]" : ""} ${negativeMargin} overflow-hidden bg-[#0f0f0f]`}
      style={isFirst ? { height } : undefined}
    >
      {/* Background Media */}
      {banners.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{
            opacity: i === current ? 1 : 0,
            scale: i === current ? 1 : 1.05,
          }}
          style={{ y: yBg }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          {b.mediaType === "video" ? (
            <video
              src={b.imageUrl}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            <Image
              src={b.imageUrl}
              alt={b.title}
              fill
              priority={i === 0}
              className="object-cover object-center"
              sizes="100vw"
            />
          )}
        </motion.div>
      ))}

      {/* Overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
      />

      {/* Massive Background Text (Parallax) */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none select-none overflow-hidden mix-blend-overlay"
        style={{ y: yText, opacity: opacityText }}
      >
        <span className="text-white/5 font-[var(--font-barlow)] font-black text-[25vw] tracking-tighter whitespace-nowrap">
          ONE STAR
        </span>
      </motion.div>

      {/* Content */}
      <div className={`relative z-20 h-full flex flex-col ${positionCls}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${banner.id}`}
            className={`max-w-2xl ${textAlign}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.3 }
              },
              exit: {
                opacity: 0,
                transition: { staggerChildren: 0.05, staggerDirection: -1 }
              }
            }}
          >
            <h1 className="flex flex-col gap-4 mb-8">
              {banner.title.split("\n").map((line, lineIndex) => (
                <div key={lineIndex} className="overflow-hidden">
                  <motion.span
                    className={`block ${
                      lineIndex === 0 
                        ? "text-white font-[var(--font-barlow)] font-black uppercase text-5xl md:text-6xl lg:text-7xl leading-[0.9] tracking-tighter" 
                        : "text-white font-[var(--font-montserrat)] font-medium text-sm md:text-lg tracking-wide"
                    }`}
                    style={lineIndex === 0 ? { textShadow: "0 4px 40px rgba(0,0,0,0.5)" } : { textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
                    variants={{
                      hidden: { y: "100%", opacity: 0 },
                      visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                      exit: { y: "-100%", opacity: 0, transition: { duration: 0.4 } }
                    }}
                  >
                    {line}
                  </motion.span>
                </div>
              ))}
            </h1>
            
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                exit: { opacity: 0, y: -20, transition: { duration: 0.4 } }
              }}
            >
              <Link
                href={banner.linkUrl ?? "/productos"}
                className={`inline-flex items-center gap-4 font-[var(--font-montserrat)] font-bold text-xs md:text-sm tracking-widest px-8 py-4 transition-colors duration-300 ${ctaCls}`}
              >
                {ctaText}
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50" />
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Scroll Indicator */}
        {isFirst && (
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <span className="text-[10px] uppercase tracking-widest mb-2 font-bold">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"
            />
          </motion.div>
        )}

        {/* Dots / Progress Indicator */}
        {showDots && banners.length > 1 && (
          <div className="absolute bottom-10 left-6 md:left-16 z-30 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "w-6 bg-white/30 hover:bg-white/50"}`}
                aria-label={`Ir al banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
