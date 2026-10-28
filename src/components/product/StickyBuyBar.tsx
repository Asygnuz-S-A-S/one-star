"use client"

import { useEffect, useState } from "react"
import { formatCOP } from "@/lib/shop-utils"

interface StickyBuyBarProps {
  /** id del bloque de botones principal: la barra aparece cuando ese bloque sale de pantalla. */
  targetId: string
  name: string
  price: number
  originalPrice?: number | null
  needsSize: boolean
  onAdd: () => void
  onNeedSize: () => void
}

/**
 * Barra fija inferior solo en móvil: precio y botón siempre a la vista cuando
 * el botón principal no está en pantalla. Si falta la talla, el botón la pide en
 * lugar de fallar en silencio.
 */
export default function StickyBuyBar({ targetId, name, price, originalPrice, needsSize, onAdd, onNeedSize }: StickyBuyBarProps) {
  const [targetInView, setTargetInView] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  // Visible en cuanto el botón principal no está en pantalla (arriba o abajo) y el cliente ya empezó a leer.
  const visible = !targetInView && scrolled

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => setTargetInView(entry.isIntersecting), { threshold: 0 })
    observer.observe(target)
    const scroller = document.getElementById("public-scroll")
    const onScroll = () => setScrolled((scroller?.scrollTop ?? window.scrollY) > 240)
    onScroll()
    scroller?.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      observer.disconnect()
      scroller?.removeEventListener("scroll", onScroll)
    }
  }, [targetId])

  return (
    <div
      role="region"
      aria-label="Compra rápida"
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#E0E0E0] bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 dark:border-white/10 dark:bg-[#111]/95 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      data-testid="sticky-buy-bar"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-montserrat text-xs text-[#4A4A4A] dark:text-gray-400">{name}</p>
          <p className="flex items-baseline gap-2 font-barlow font-bold text-[#1C1C1C] dark:text-white">
            <span className="text-lg">{formatCOP(price)}</span>
            {originalPrice && originalPrice > price && (
              <span className="text-xs font-normal text-[#4A4A4A] line-through dark:text-gray-500">{formatCOP(originalPrice)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          tabIndex={visible ? 0 : -1}
          onClick={needsSize ? onNeedSize : onAdd}
          className="shrink-0 bg-[#E31C23] px-5 py-3 font-barlow text-sm font-bold uppercase tracking-widest text-white active:bg-[#C01920]"
        >
          {needsSize ? "Elige tu talla" : "Agregar a la bolsa"}
        </button>
      </div>
    </div>
  )
}
