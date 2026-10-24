"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useCart } from "@/store"
import { formatCOP } from "@/lib/shop-utils"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"
import { useShippingRates } from "@/components/storefront/ShippingRatesProvider"
import { getColorSwatchStyle } from "@/lib/colors"

// Misma superficie de la ficha: la foto (fondo blanco) se funde con multiply, sin recuadro gris.
const THUMB_STAGE = "bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_0%,#f7f7f5_55%,#ececea_100%)]"

/** Progreso hacia el envío gratis: motiva a completar el pedido sin esperar al checkout. */
function FreeShippingProgress({ subtotal }: { subtotal: number }) {
  const { freeThreshold } = useShippingRates()
  const missing = Math.max(0, freeThreshold - subtotal)
  const progress = Math.min(100, (subtotal / Math.max(freeThreshold, 1)) * 100)
  return (
    <div className="px-5 pt-4" data-testid="free-shipping-progress">
      <p className="font-montserrat text-xs text-[#1C1C1C]">
        {missing === 0
          ? <><span className="font-semibold text-emerald-700">¡Tienes envío gratis!</span> en envío estándar</>
          : <>Te faltan <span className="font-semibold">{formatCOP(missing)}</span> para el envío gratis</>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ECECEA]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progreso hacia el envío gratis">
        <div className={`h-full rounded-full transition-[width] duration-500 ${missing === 0 ? "bg-emerald-600" : "bg-[#E31C23]"}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function IconX({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="16" y2="16" />
      <line x1="16" y1="4" x2="4" y2="16" />
    </svg>
  )
}

function IconCartEmpty() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      stroke="#E0E0E0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 8L12 20v36a4 4 0 004 4h32a4 4 0 004-4V20l-8-12z" />
      <line x1="12" y1="20" x2="52" y2="20" />
      <path d="M40 28a8 8 0 01-16 0" />
    </svg>
  )
}

const drawerSpring = { type: "spring", stiffness: 380, damping: 36 } as const

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal, totalItems } = useCart()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Accesibilidad del diálogo: Escape cierra, el foco entra al abrir,
  // Tab queda atrapado dentro y el foco vuelve al trigger al cerrar.
  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeCart()
        return
      }
      if (e.key !== "Tab" || !drawerRef.current) return
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !drawerRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !drawerRef.current.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen, closeCart])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="cart-overlay"
            onClick={closeCart}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          {/* Drawer */}
          <motion.div
            key="cart-drawer"
            ref={drawerRef}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl sm:rounded-l-[var(--store-radius-xl)]"
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={drawerSpring}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0E0E0]">
              <div className="flex items-center gap-2">
                <h2 className="font-barlow text-xl font-extrabold uppercase tracking-[-0.01em] text-[#1C1C1C]">
                  Tu bolsa
                </h2>
                {totalItems > 0 && (
                  <span className="font-montserrat text-sm text-[#4A4A4A]">
                    ({totalItems} {totalItems === 1 ? "producto" : "productos"})
                  </span>
                )}
              </div>
              <button
                ref={closeButtonRef}
                onClick={closeCart}
                aria-label="Cerrar carrito"
                className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-[#4A4A4A] transition-colors hover:bg-[#F2F2F0] hover:text-[#1C1C1C] focus-visible:outline-2 focus-visible:outline-[#E31C23]"
              >
                <IconX />
              </button>
            </div>

            {/* Content */}
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center">
                <IconCartEmpty />
                <p className="font-barlow font-bold text-lg text-[#1C1C1C] uppercase tracking-wide">
                  Tu carrito está vacío
                </p>
                <p className="font-montserrat text-sm text-[#4A4A4A]">
                  Agrega productos para comenzar
                </p>
                <Link
                  href="/productos"
                  onClick={closeCart}
                  className="mt-2 inline-flex min-h-12 items-center rounded-[var(--store-radius-md)] bg-[#E31C23] px-6 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C01920]"
                >
                  Explorar productos
                </Link>
              </div>
            ) : (
              <>
                {items.some((item) => item.kind !== "gift_card") && <FreeShippingProgress subtotal={subtotal} />}

                {/* Items list */}
                <div className="flex flex-1 flex-col divide-y divide-[#ECECEA] overflow-y-auto px-5 py-2">
                  <AnimatePresence initial={false}>
                    {items.map((item, i) => (
                      <motion.div
                        key={item.id}
                        className="flex gap-3 py-4"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 24, height: 0, paddingBlock: 0 }}
                        transition={{ duration: 0.22, delay: i * 0.04 }}
                      >
                        {/* Image */}
                        <div className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--store-radius-md)] ${THUMB_STAGE}`}>
                          <Image
                            src={item.imageUrl || PLACEHOLDER_IMAGE_URL}
                            alt={item.name}
                            fill
                            className="scale-[1.25] object-contain mix-blend-multiply"
                            sizes="96px"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="line-clamp-2 font-barlow text-sm font-semibold uppercase leading-tight text-[#1C1C1C]">
                              {item.name}
                            </p>
                            <button
                              onClick={() => removeItem(item.id)}
                              aria-label={`Eliminar ${item.name}`}
                              className="-mr-2 -mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#9E9E9E] transition-colors hover:bg-[#F2F2F0] hover:text-[#E31C23]"
                            >
                              <IconX size={14} />
                            </button>
                          </div>
                          {item.brand && (
                            <p className="font-montserrat text-[11px] uppercase tracking-[0.08em] text-[#4A4A4A]">{item.brand}</p>
                          )}
                          <p className="flex items-center gap-1.5 font-montserrat text-xs text-[#4A4A4A]">
                            {item.kind === "gift_card" ? (
                              "Entrega digital · Vigencia de 12 meses"
                            ) : (
                              <>
                                <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={getColorSwatchStyle(item.color)} />
                                <span className="capitalize">{item.color.toLowerCase()}</span>
                                <span aria-hidden="true">·</span>
                                <span>Talla: {item.size}</span>
                              </>
                            )}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex items-center rounded-full border border-[#E0E0E0] bg-white">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                aria-label="Reducir cantidad"
                                className="grid h-9 w-9 place-items-center rounded-full font-montserrat text-base text-[#1C1C1C] transition-colors hover:bg-[#F2F2F0]"
                              >
                                −
                              </button>
                              <span className="w-6 text-center font-montserrat text-sm font-semibold tabular-nums text-[#1C1C1C]" aria-live="polite">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                aria-label="Aumentar cantidad"
                                className="grid h-9 w-9 place-items-center rounded-full font-montserrat text-base text-[#1C1C1C] transition-colors hover:bg-[#F2F2F0]"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <p className={`font-barlow text-base font-bold ${item.price !== item.originalPrice ? "text-[#E31C23]" : "text-[#1C1C1C]"}`}>
                                {formatCOP(item.price * item.quantity)}
                              </p>
                              {item.price !== item.originalPrice && (
                                <p className="font-montserrat text-xs text-[#4A4A4A] line-through">
                                  {formatCOP(item.originalPrice * item.quantity)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex flex-col gap-3 border-t border-[#ECECEA] bg-white px-5 pt-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
                  {items.some((item) => item.originalPrice > item.price) && (
                    <div className="flex items-center justify-between font-montserrat text-sm text-emerald-700">
                      <span>Ahorras</span>
                      <span className="font-semibold">
                        −{formatCOP(items.reduce((sum, item) => sum + Math.max(0, item.originalPrice - item.price) * item.quantity, 0))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="font-montserrat text-sm text-[#4A4A4A]">Subtotal</span>
                    <span className="font-barlow text-2xl font-bold tracking-tight text-[#1C1C1C]">
                      {formatCOP(subtotal)}
                    </span>
                  </div>
                  <p className="-mt-2 font-montserrat text-xs text-[#4A4A4A]">
                    Envío y cupones se calculan en el checkout
                  </p>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="flex min-h-14 w-full items-center justify-between rounded-[var(--store-radius-md)] bg-[#E31C23] px-5 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C01920]"
                  >
                    <span>Ir al checkout</span>
                    <span className="flex items-center gap-2">
                      {formatCOP(subtotal)}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </span>
                  </Link>
                  <button
                    onClick={closeCart}
                    className="min-h-11 w-full text-center font-montserrat text-sm font-medium text-[#1C1C1C] underline-offset-4 hover:underline"
                  >
                    Seguir comprando
                  </button>
                  <p className="flex items-center justify-center gap-1.5 font-montserrat text-[11px] text-[#4A4A4A]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                    Pago seguro con ePayco · 30 días para cambios
                  </p>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
