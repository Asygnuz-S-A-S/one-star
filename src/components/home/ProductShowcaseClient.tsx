"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react"

export interface ShowcaseItem {
  id: string
  slug: string
  name: string
  brand: string
  price: number
  salePrice?: number
  imageUrl?: string
  secondaryImageUrl?: string
  gallery?: string[]
  isOnSale?: boolean
}

interface Props {
  title: string
  products: ShowcaseItem[]
  theme?: "light" | "dark"
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

const stageVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 160 : -160, opacity: 0, rotate: dir > 0 ? 14 : -14, scale: 0.75 }),
  center: { x: 0, opacity: 1, rotate: 0, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -160 : 160, opacity: 0, rotate: dir > 0 ? -14 : 14, scale: 0.75 }),
  // Al hacer clic, el producto "despega" hacia el usuario antes de abrir la ficha
  launch: { scale: 1.55, y: -50, opacity: 0, rotate: -6, transition: { type: "spring", stiffness: 220, damping: 20 } },
}

/** Duración de la animación de salida antes de navegar (ms). */
const LAUNCH_MS = 420

export default function ProductShowcaseClient({ title, products, theme = "light" }: Props) {
  const reduce = useReducedMotion()
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [frame, setFrame] = useState(0)
  const [launching, setLaunching] = useState(false)

  // Al hacer clic en un producto: reproduce la animación de "despegue" y luego
  // navega a la ficha (donde el contenido entra con su propia animación).
  const launchTo = useCallback(
    (slug: string) => {
      if (launching) return
      if (reduce) {
        router.push(`/productos/${slug}`)
        return
      }
      setLaunching(true)
      setTimeout(() => router.push(`/productos/${slug}`), LAUNCH_MS)
    },
    [launching, reduce, router]
  )

  const count = products.length
  const active = products[index]
  const prevItem = products[(index - 1 + count) % count]
  const nextItem = products[(index + 1) % count]

  const frames = [active?.imageUrl, active?.secondaryImageUrl, ...(active?.gallery ?? [])].filter(
    Boolean
  ) as string[]

  const go = useCallback(
    (d: number) => {
      setDir(d)
      setFrame(0)
      setIndex((i) => (i + d + count) % count)
    },
    [count]
  )

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (frames.length <= 1) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = Math.max(0, Math.min(0.9999, (e.clientX - rect.left) / rect.width))
      setFrame(Math.floor(x * frames.length))
    },
    [frames.length]
  )

  if (count === 0 || !active) return null

  const isDark = theme === "dark"
  const price = active.isOnSale && active.salePrice ? active.salePrice : active.price

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-b from-background to-surface-3 text-foreground ${isDark ? "dark" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 md:pt-14 md:pb-20">
        {/* Título de sección */}
        <div className="flex items-center justify-between mb-6 md:mb-2">
          <h2 className="font-[var(--font-barlow)] font-black uppercase text-xl md:text-2xl tracking-tight text-foreground">
            {title}
          </h2>
          <span className="font-[var(--font-montserrat)] text-xs tracking-widest tabular-nums opacity-50">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
        </div>

        {/* Escenario */}
        <div className="relative flex items-center justify-center min-h-[360px] md:min-h-[440px]">
          {/* Vecino izquierdo (difuminado) */}
          {count > 1 && (
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Producto anterior"
              className="hidden md:block absolute left-0 lg:left-8 top-1/2 -translate-y-1/2 w-40 lg:w-56 aspect-square opacity-40 blur-sm hover:opacity-60 hover:blur-[2px] transition-all duration-300 z-0"
            >
              {prevItem?.imageUrl && (
                <Image
                  src={prevItem.imageUrl}
                  alt={prevItem.name}
                  fill
                  className="object-contain -rotate-12"
                  sizes="224px"
                />
              )}
            </button>
          )}

          {/* Vecino derecho (difuminado) */}
          {count > 1 && (
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Producto siguiente"
              className="hidden md:block absolute right-0 lg:right-8 top-1/2 -translate-y-1/2 w-40 lg:w-56 aspect-square opacity-40 blur-sm hover:opacity-60 hover:blur-[2px] transition-all duration-300 z-0"
            >
              {nextItem?.imageUrl && (
                <Image
                  src={nextItem.imageUrl}
                  alt={nextItem.name}
                  fill
                  className="object-contain rotate-12"
                  sizes="224px"
                />
              )}
            </button>
          )}

          {/* Producto activo con rotación al mover el cursor */}
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.div
              key={active.id}
              custom={dir}
              variants={reduce ? undefined : stageVariants}
              initial="enter"
              animate={launching ? "launch" : "center"}
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative z-10 w-[68vw] max-w-[440px] aspect-square cursor-pointer"
              onMouseMove={handleMove}
              onMouseLeave={() => setFrame(0)}
            >
              <Link
                href={`/productos/${active.slug}`}
                className="absolute inset-0 z-20"
                aria-label={active.name}
                onClick={(e) => { e.preventDefault(); launchTo(active.slug) }}
              />
              {frames.map((src, i) => (
                <Image
                  key={`${active.id}-${i}`}
                  src={src}
                  alt={`${active.name} vista ${i + 1}`}
                  fill
                  priority={i === 0}
                  className={`object-contain drop-shadow-2xl transition-opacity duration-150 ${
                    i === frame ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="(max-width: 768px) 68vw, 440px"
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Texto: marca gigante + nombre/precio + CTA */}
        <div
          className="relative text-center mt-4 md:mt-6 min-h-[150px] transition-opacity duration-300"
          style={{ opacity: launching ? 0 : 1 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -16 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <h3 className="font-[var(--font-barlow)] font-black uppercase leading-[0.85] tracking-tight text-[13vw] md:text-[6.5rem]">
                {active.brand || "One Star"}
              </h3>
              <p className="font-[var(--font-montserrat)] text-xs md:text-sm tracking-widest uppercase mt-2 opacity-70">
                {active.name}
                <span className="mx-2 opacity-40">|</span>
                <span className={active.isOnSale ? "text-[#E31C23] font-bold" : "font-semibold"}>
                  {formatPrice(price)}
                </span>
              </p>
              <Link
                href={`/productos/${active.slug}`}
                onClick={(e) => { e.preventDefault(); launchTo(active.slug) }}
                className="inline-block mt-5 font-[var(--font-montserrat)] text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full border border-foreground text-foreground transition-colors duration-200 hover:bg-foreground hover:text-background"
              >
                Ver más
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controles: flechas (móvil) + puntos */}
        {count > 1 && (
          <div
            className="flex items-center justify-center gap-4 mt-8 transition-opacity duration-300"
            style={{ opacity: launching ? 0 : 1 }}
          >
            <motion.button
              type="button"
              onClick={() => go(-1)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Anterior"
              className="p-2 rounded-full border border-foreground/30 text-foreground"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </motion.button>

            <div className="flex items-center gap-2">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setDir(i > index ? 1 : -1); setFrame(0); setIndex(i) }}
                  aria-label={`Ir al producto ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index
                      ? "w-6 bg-foreground"
                      : "w-2 bg-foreground/30"
                  }`}
                />
              ))}
            </div>

            <motion.button
              type="button"
              onClick={() => go(1)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Siguiente"
              className="p-2 rounded-full border border-foreground/30 text-foreground"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>
    </section>
  )
}
