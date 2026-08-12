"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, MotionConfig, type Variants } from "motion/react"
import type { ProductWithRelations, Variant } from "@/types/shop"
import SizeGuideModal from "./SizeGuideModal"
import { formatCOP } from "@/lib/shop-utils"
import { useCart } from "@/store"
import { useToast } from "@/hooks/useToast"
import ToastContainer from "@/components/ui/ToastContainer"

interface ProductInfoProps {
  product: ProductWithRelations
  reviewStats?: { avg: number; count: number; distribution: number[] }
}

/** Entrada escalonada del panel: cada bloque aparece con un resorte con rebote. */
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 15 },
  },
}

const springy = { type: "spring", stiffness: 400, damping: 15 } as const

function getUniqueColors(variants: Variant[]): string[] {
  return [...new Set(variants.map((v) => v.color))]
}

function getUniqueSizes(variants: Variant[], color: string): string[] {
  const filtered = variants.filter((v) => v.color === color)
  const sizes = [...new Set(filtered.map((v) => v.size))]
  return sizes.sort((a, b) => Number(a) - Number(b))
}

function isAvailable(variants: Variant[], color: string, size: string): boolean {
  return variants.some((v) => v.color === color && v.size === size && v.stock > 0)
}

/** Converts a color name string to a CSS-compatible color for the swatch */
function colorToCSS(color: string): string {
  const map: Record<string, string> = {
    negro: "#1C1C1C",
    blanco: "#FFFFFF",
    rojo: "#E31C23",
    azul: "#1A55A0",
    verde: "#2D7A2D",
    gris: "#9E9E9E",
    amarillo: "#F5C518",
    naranja: "#F07B20",
    morado: "#7B2D8B",
    rosado: "#E91E8C",
    beige: "#D4B896",
    café: "#795548",
    marron: "#795548",
  }
  return map[color.toLowerCase()] ?? "#9E9E9E"
}

export default function ProductInfo({ product, reviewStats }: ProductInfoProps) {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.variants[0]?.color ?? ""
  )
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [sizeModalOpen, setSizeModalOpen] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const { addItem, openCart } = useCart()
  const { toasts, showToast, dismissToast } = useToast()
  const router = useRouter()

  const basePrice = Number(product.basePrice)
  const salePrice = product.salePrice ? Number(product.salePrice) : null
  const savings = salePrice ? basePrice - salePrice : null

  const colors = getUniqueColors(product.variants)
  const sizesForColor = selectedColor ? getUniqueSizes(product.variants, selectedColor) : []

  const handleColorSelect = useCallback((color: string) => {
    setSelectedColor(color)
    setSelectedSize("") // reset size when color changes
  }, [])

  const handleSizeSelect = useCallback((size: string) => {
    if (!isAvailable(product.variants, selectedColor, size)) return
    setSelectedSize(size)
  }, [product.variants, selectedColor])

  const triggerShake = useCallback(() => {
    setShakeActive(true)
    setTimeout(() => setShakeActive(false), 600)
  }, [])

  const buildCartItem = useCallback(() => {
    const variant = product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    )
    if (!variant) return null
    const effectivePrice = salePrice ?? basePrice
    return {
      id: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      imageUrl: product.images[0]?.url ?? null,
      size: selectedSize,
      color: selectedColor,
      price: effectivePrice,
      originalPrice: basePrice,
      sku: variant.sku,
    }
  }, [product, selectedColor, selectedSize, basePrice, salePrice])

  const handleAddToCart = useCallback(() => {
    if (!selectedSize) {
      triggerShake()
      return
    }
    const cartItem = buildCartItem()
    if (!cartItem) return
    addItem(cartItem)
    openCart()
    showToast("¡Agregado al carrito!", "success")
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1600)
  }, [selectedSize, triggerShake, buildCartItem, addItem, openCart, showToast])

  const handleBuyNow = useCallback(() => {
    if (!selectedSize) {
      triggerShake()
      return
    }
    const cartItem = buildCartItem()
    if (!cartItem) return
    addItem(cartItem)
    router.push("/checkout")
  }, [selectedSize, triggerShake, buildCartItem, addItem, router])

  const canAct = Boolean(selectedSize)

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex flex-col gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Brand */}
        {product.brand && (
          <motion.div variants={itemVariants}>
            <Link
              href={`/buscar?marca=${encodeURIComponent(product.brand)}`}
              className="font-[var(--font-montserrat)] text-xs uppercase tracking-widest text-[#4A4A4A] hover:text-[#1C1C1C] transition-colors w-fit"
            >
              {product.brand}
            </Link>
          </motion.div>
        )}

        {/* Name + badge */}
        <motion.div variants={itemVariants} className="flex items-start gap-3 flex-wrap">
          <h1 className="font-[var(--font-barlow)] font-bold text-2xl md:text-3xl text-[#1C1C1C] dark:text-white leading-tight flex-1">
            {product.name}
          </h1>
          {product.isOnSale && (
            <motion.span
              className="flex-shrink-0 mt-1 bg-[#E31C23] text-white font-[var(--font-barlow)] font-bold text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm"
              animate={{ y: [0, -5, 0], rotate: [-3, 3, -2, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.4, ease: "easeInOut" }}
            >
              SALE
            </motion.span>
          )}
          {!product.isOnSale && (
            <motion.span
              className="flex-shrink-0 mt-1 bg-[#1C1C1C] dark:bg-white text-white dark:text-black font-[var(--font-barlow)] font-bold text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 2.8, ease: "easeInOut" }}
            >
              NUEVO
            </motion.span>
          )}
          {product.availableOnline === false && (
            <span className="flex-shrink-0 mt-1 bg-[#F5C518] text-[#1C1C1C] font-[var(--font-barlow)] font-bold text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm">
              SÓLO EN TIENDAS
            </span>
          )}
        </motion.div>

        {/* Star rating */}
        {reviewStats && reviewStats.count > 0 && (
          <motion.div variants={itemVariants} className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.svg
                  key={star}
                  width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                  className={star <= Math.round(reviewStats.avg) ? "text-yellow-400" : "text-gray-200 dark:text-white/10"}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 12, delay: 0.3 + star * 0.06 }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </motion.svg>
              ))}
            </div>
            <span className="font-[var(--font-montserrat)] text-sm font-semibold text-[#1C1C1C] dark:text-white">
              {reviewStats.avg.toFixed(1)}
            </span>
            <span className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400">
              ({reviewStats.count} reseña{reviewStats.count !== 1 ? "s" : ""})
            </span>
          </motion.div>
        )}

        {/* Price */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1">
          {product.isOnSale && salePrice ? (
            <div className="flex items-center gap-3">
              <span className="font-[var(--font-barlow)] font-bold text-3xl text-[#E31C23]">
                {formatCOP(salePrice)}
              </span>
              <span className="font-[var(--font-montserrat)] text-[#4A4A4A] text-lg line-through">
                {formatCOP(basePrice)}
              </span>
            </div>
          ) : (
            <span className="font-[var(--font-barlow)] font-bold text-3xl text-[#1C1C1C] dark:text-white">
              {formatCOP(basePrice)}
            </span>
          )}
          {savings && savings > 0 && (
            <p className="font-[var(--font-montserrat)] text-sm text-green-600 font-medium">
              Ahorras {formatCOP(savings)}
            </p>
          )}
        </motion.div>

        {/* Color selector */}
        {colors.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-col gap-2">
            <p className="font-[var(--font-montserrat)] text-sm font-medium text-[#1C1C1C] dark:text-white">
              Color:{" "}
              <span className="font-normal text-[#4A4A4A] dark:text-gray-400 capitalize">{selectedColor}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => {
                const active = selectedColor === color
                return (
                  <motion.button
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    aria-label={`Color ${color}`}
                    whileHover={{ scale: 1.18 }}
                    whileTap={{ scale: 0.85 }}
                    animate={{ scale: active ? 1.12 : 1 }}
                    transition={springy}
                    className={`w-8 h-8 rounded-full ${
                      active
                        ? "ring-2 ring-offset-2 ring-[#1C1C1C] dark:ring-white dark:ring-offset-black"
                        : "ring-1 ring-[#E0E0E0] hover:ring-[#4A4A4A]"
                    }`}
                    style={{ backgroundColor: colorToCSS(color) }}
                  />
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Size selector */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-[var(--font-montserrat)] text-sm font-medium text-[#1C1C1C] dark:text-white">
              Talla
            </p>
            <button
              onClick={() => setSizeModalOpen(true)}
              className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-gray-400 underline hover:text-[#1C1C1C] dark:hover:text-white transition-colors"
            >
              Guía de tallas
            </button>
          </div>

          <motion.div
            className="grid grid-cols-5 gap-2"
            animate={shakeActive ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {sizesForColor.map((size) => {
              const available = isAvailable(product.variants, selectedColor, size)
              const isActive = selectedSize === size
              return (
                <motion.button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  disabled={!available}
                  aria-label={`Talla ${size}${!available ? " - Agotado" : ""}`}
                  whileHover={available ? { scale: 1.09, y: -2 } : undefined}
                  whileTap={available ? { scale: 0.9 } : undefined}
                  animate={{ scale: isActive ? 1.06 : 1 }}
                  transition={springy}
                  className={`
                    py-2 border font-[var(--font-montserrat)] text-sm font-medium
                    ${isActive
                      ? "bg-[#1C1C1C] text-white border-[#1C1C1C] dark:bg-white dark:text-black dark:border-white"
                      : available
                        ? "bg-white text-[#1C1C1C] border-[#E0E0E0] hover:border-[#1C1C1C] dark:bg-white/5 dark:text-white dark:border-white/20"
                        : "bg-white text-[#4A4A4A] border-[#E0E0E0] opacity-40 cursor-not-allowed line-through dark:bg-white/5"
                    }
                  `}
                >
                  {size}
                </motion.button>
              )
            })}
          </motion.div>

          <AnimatePresence>
            {shakeActive && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="font-[var(--font-montserrat)] text-xs text-[#E31C23] font-semibold"
              >
                Selecciona una talla
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action buttons */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          {product.availableOnline === false ? (
            <div className="w-full py-4 text-center border-2 border-[#1C1C1C] text-[#1C1C1C] font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm bg-[#F5F5F5] dark:border-white dark:text-white dark:bg-white/5">
              Producto exclusivo de tiendas físicas
            </div>
          ) : (
            <>
              <motion.button
                onClick={handleAddToCart}
                disabled={!canAct}
                whileHover={canAct ? { scale: 1.03 } : undefined}
                whileTap={canAct ? { scale: 0.95 } : undefined}
                animate={justAdded ? { scale: [1, 1.08, 0.96, 1] } : { scale: 1 }}
                transition={springy}
                className={`relative w-full py-4 font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm overflow-hidden ${
                  justAdded
                    ? "bg-green-600 text-white"
                    : canAct
                      ? "bg-[#1C1C1C] text-white hover:bg-[#333] dark:bg-white dark:text-black dark:hover:bg-gray-200"
                      : "bg-[#1C1C1C] text-white opacity-50 cursor-not-allowed dark:bg-white dark:text-black"
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {justAdded ? (
                    <motion.span
                      key="added"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-center gap-2"
                    >
                      ¡Agregado!
                      <motion.svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 12 }}
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </motion.svg>
                    </motion.span>
                  ) : (
                    <motion.span
                      key="add"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      Agregar al Carrito
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                onClick={handleBuyNow}
                disabled={!canAct}
                whileHover={canAct ? { scale: 1.03 } : undefined}
                whileTap={canAct ? { scale: 0.95 } : undefined}
                transition={springy}
                className={`w-full py-4 font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm ${
                  canAct
                    ? "bg-[#E31C23] text-white hover:bg-[#C01920]"
                    : "bg-[#E31C23] text-white opacity-50 cursor-not-allowed"
                }`}
              >
                Comprar Ahora
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Accordion: description, extended description, shipping */}
        <motion.div variants={itemVariants} className="flex flex-col divide-y divide-[#E0E0E0] dark:divide-white/10 border-t border-[#E0E0E0] dark:border-white/10">
          {product.description && (
            <AccordionItem title="Descripción">
              <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
                {product.description}
              </p>
            </AccordionItem>
          )}

          {product.extendedDescription && (
            <AccordionItem title="Descripción extendida">
              <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {product.extendedDescription}
              </p>
            </AccordionItem>
          )}

          <AccordionItem title="Envío y devoluciones">
            <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
              Envío gratis en compras mayores a $200.000. Entregas en todo Colombia de 3 a 5 días hábiles.
              Devoluciones gratuitas dentro de los 30 días siguientes a la compra, siempre que el producto
              esté en su estado original y sin uso.
            </p>
          </AccordionItem>
        </motion.div>
      </motion.div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <SizeGuideModal isOpen={sizeModalOpen} onClose={() => setSizeModalOpen(false)} />
    </MotionConfig>
  )
}

interface AccordionItemProps {
  title: string
  children: React.ReactNode
}

function AccordionItem({ title, children }: AccordionItemProps) {
  return (
    <details className="group py-4">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <span className="font-[var(--font-barlow)] font-semibold text-sm uppercase tracking-wider text-[#1C1C1C] dark:text-white">
          {title}
        </span>
        <span className="text-[#4A4A4A] dark:text-gray-400 transition-transform group-open:rotate-45 ml-2 text-xl leading-none select-none">
          +
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}
