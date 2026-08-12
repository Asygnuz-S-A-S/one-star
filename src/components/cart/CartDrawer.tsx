"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useCart } from "@/store"
import { formatCOP } from "@/lib/shop-utils"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"

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
            className="fixed inset-0 z-40 bg-black/50"
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
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
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
                <h2 className="font-barlow font-bold text-base uppercase tracking-widest text-[#1C1C1C]">
                  Mi Carrito
                </h2>
                {totalItems > 0 && (
                  <span className="bg-[#E31C23] text-white font-montserrat font-medium text-xs px-2 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                ref={closeButtonRef}
                onClick={closeCart}
                aria-label="Cerrar carrito"
                className="text-[#4A4A4A] hover:text-[#E31C23] transition-colors p-1 focus-visible:outline-2 focus-visible:outline-[#E31C23]"
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
                  className="mt-2 bg-[#E31C23] text-white font-barlow font-bold uppercase tracking-widest text-sm px-6 py-3 hover:bg-[#C01920] transition-colors"
                >
                  Explorar productos
                </Link>
              </div>
            ) : (
              <>
                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col divide-y divide-[#E0E0E0]">
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
                        <div className="relative w-20 h-20 bg-[#E0E0E0] shrink-0">
                          <Image
                            src={item.imageUrl || PLACEHOLDER_IMAGE_URL}
                            alt={item.name}
                            fill
                            className={item.imageUrl ? "object-cover" : "object-contain"}
                            sizes="80px"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex flex-col flex-1 min-w-0 gap-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-barlow font-semibold text-sm text-[#1C1C1C] leading-tight truncate">
                              {item.name}
                            </p>
                            <button
                              onClick={() => removeItem(item.id)}
                              aria-label={`Eliminar ${item.name}`}
                              className="text-[#4A4A4A] hover:text-[#E31C23] transition-colors shrink-0 p-0.5"
                            >
                              <IconX size={14} />
                            </button>
                          </div>
                          {item.brand && (
                            <p className="font-montserrat text-xs text-[#4A4A4A]">{item.brand}</p>
                          )}
                          <p className="font-montserrat text-xs text-[#4A4A4A]">
                            Talla: {item.size} · Color: {item.color}
                          </p>

                          <div className="flex items-center justify-between mt-auto pt-1">
                            <div className="flex items-center border border-[#E0E0E0]">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                aria-label="Reducir cantidad"
                                className="w-7 h-7 flex items-center justify-center text-[#1C1C1C] hover:bg-[#E0E0E0] transition-colors font-montserrat text-sm"
                              >
                                −
                              </button>
                              <span className="w-7 h-7 flex items-center justify-center font-montserrat text-sm text-[#1C1C1C]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                aria-label="Aumentar cantidad"
                                className="w-7 h-7 flex items-center justify-center text-[#1C1C1C] hover:bg-[#E0E0E0] transition-colors font-montserrat text-sm"
                              >
                                +
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="font-barlow font-bold text-sm text-[#1C1C1C]">
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
                <div className="border-t border-[#E0E0E0] px-5 py-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-montserrat text-sm text-[#4A4A4A]">Subtotal</span>
                    <span className="font-barlow font-bold text-lg text-[#1C1C1C]">
                      {formatCOP(subtotal)}
                    </span>
                  </div>
                  <p className="font-montserrat text-xs text-[#4A4A4A]">
                    Envío calculado en el checkout
                  </p>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="block w-full text-center bg-[#E31C23] text-white font-barlow font-bold uppercase tracking-widest text-sm py-4 hover:bg-[#C01920] transition-colors"
                  >
                    Ir al checkout
                  </Link>
                  <button
                    onClick={closeCart}
                    className="w-full text-center border border-[#1C1C1C] text-[#1C1C1C] font-barlow font-bold uppercase tracking-widest text-sm py-3 hover:bg-[#1C1C1C] hover:text-white transition-colors"
                  >
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
