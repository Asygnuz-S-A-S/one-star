"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"

interface Banner {
  id: number
  title: string
  subtitle: string
  imageUrl: string
  ctaText: string
  ctaHref: string
  badge: string
}

const BANNERS: Banner[] = [
  {
    id: 1,
    title: "Nueva Temporada",
    subtitle: "Los modelos más esperados del año ya están aquí. Estilo sin compromisos.",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80",
    ctaText: "Ver Colección",
    ctaHref: "/lanzamientos",
    badge: "SS25",
  },
  {
    id: 2,
    title: "Rendimiento\nAl Máximo",
    subtitle: "Tecnología de élite para cada kilómetro. Zapatillas que marcan la diferencia.",
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1600&q=80",
    ctaText: "Explorar Ahora",
    ctaHref: "/hombre",
    badge: "NUEVA TEMPORADA",
  },
  {
    id: 3,
    title: "Estilo Urbano",
    subtitle: "Del gym a la calle. Diseños que se adaptan a tu ritmo de vida.",
    imageUrl: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1600&q=80",
    ctaText: "Descubrir",
    ctaHref: "/mujer",
    badge: "EXCLUSIVO",
  },
]

export default function HeroBanner() {
  const [current, setCurrent] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % BANNERS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [current])

  function goTo(index: number) {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrent(index)
    setTimeout(() => setIsTransitioning(false), 400)
  }

  const banner = BANNERS[current]

  return (
    <section className="relative h-[70vh] md:h-[85vh] overflow-hidden bg-[#1C1C1C]">
      {/* Images */}
      {BANNERS.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0"}`}
        >
          <Image
            src={b.imageUrl}
            alt={b.title}
            fill
            priority={i === 0}
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-end pb-16 px-6 md:px-16 lg:px-24">
        <AnimatePresence mode="wait">
          <motion.span
            key={`badge-${banner.id}`}
            className="absolute top-8 left-6 md:left-16 lg:left-24 inline-block bg-[#E31C23] text-white text-xs font-bold font-[var(--font-barlow)] tracking-widest uppercase px-3 py-1"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {banner.badge}
          </motion.span>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${banner.id}`}
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <h1
              className="text-white font-[var(--font-barlow)] font-black uppercase text-4xl md:text-6xl lg:text-7xl leading-none tracking-tight mb-4 whitespace-pre-line"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}
            >
              {banner.title}
            </h1>
            <p className="text-white/90 font-[var(--font-montserrat)] text-sm md:text-base mb-8 max-w-md leading-relaxed">
              {banner.subtitle}
            </p>
            <Link
              href={banner.ctaHref}
              className="inline-block bg-white text-[#1C1C1C] font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-[#E31C23] hover:text-white transition-colors duration-200"
            >
              {banner.ctaText}
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-2 mt-8">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1 transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-4 bg-white/40"}`}
              aria-label={`Ir al banner ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Prev/Next buttons */}
      <button
        onClick={() => goTo((current - 1 + BANNERS.length) % BANNERS.length)}
        className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 items-center justify-center text-white transition-colors"
        aria-label="Banner anterior"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>
      <button
        onClick={() => goTo((current + 1) % BANNERS.length)}
        className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 items-center justify-center text-white transition-colors"
        aria-label="Banner siguiente"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6" />
        </svg>
      </button>
    </section>
  )
}
