"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { getColorSwatchStyle } from "@/lib/colors"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, MotionConfig, type Transition, type Variants } from "motion/react"
import type { ProductWithRelations, Variant } from "@/types/shop"
import SizeGuideModal, { type BrandSizeGuide } from "./SizeGuideModal"
import { formatCOP } from "@/lib/shop-utils"
import { filterImagesByColor, getPrimaryImageUrl } from "@/lib/product-image"
import { useCart } from "@/store"
import { META_CURRENCY, trackMetaEvent } from "@/lib/tracking/meta-pixel"
import { useToast } from "@/hooks/useToast"
import ToastContainer from "@/components/ui/ToastContainer"
import { buildProductFamilyCardColorSummary } from "@/lib/product-card-colors"
import { getVariantStoreStock } from "@/lib/store-location"
import { getConversionSignals } from "@/lib/conversion-signals"
import { GIFT_CARD_CATEGORY_SLUG } from "@/lib/gift-card"
import ConversionSignals from "./ConversionSignals"
import ProductTrust from "./ProductTrust"
import { splitHighlight } from "@/lib/product-faq"
import StickyBuyBar from "./StickyBuyBar"
import { RETURN_WINDOW_DAYS, type StorePromise } from "@/lib/store-promises"
import { useDeliveryDays, useShippingRates } from "@/components/storefront/ShippingRatesProvider"
import { getProductAvailability } from "@/lib/product-availability"

interface ProductInfoProps {
  product: ProductWithRelations
  reviewStats?: { avg: number; count: number; distribution: number[] }
  /** Garantías reales de la tienda (envío, entrega, cambios, pago) que se muestran junto al botón. */
  promises?: StorePromise[]
  whatsappUrl?: string | null
  brand?: BrandSizeGuide | null
  /** Color controlado desde el padre para sincronizar la galería. */
  selectedColor?: string
  onColorChange?: (color: string) => void
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
    transition: { type: "spring", stiffness: 380, damping: 39 },
  },
}

const springy = { type: "spring" as const, stiffness: 400, damping: 40 }

/**
 * El "pop" de confirmación al agregar al carrito recorre varios keyframes, y
 * Motion solo admite dos con transiciones spring (lanza un error en runtime).
 * Se anima con tween para conservar el rebote sin romper el botón.
 */
const popTween: Transition = { duration: 0.4, times: [0, 0.3, 0.65, 1], ease: "easeOut" }

function getUniqueSizes(variants: Variant[], color: string): string[] {
  const filtered = variants.filter((v) => v.color === color)
  const sizes = [...new Set(filtered.map((v) => v.size))]
  return sizes.sort((a, b) => Number(a) - Number(b))
}

function isAvailable(variants: Variant[], color: string, size: string): boolean {
  return variants.some((v) => v.color === color && v.size === size && v.stock > 0)
}

export default function ProductInfo({
  product,
  reviewStats,
  promises = [],
  whatsappUrl = null,
  brand = null,
  selectedColor: controlledColor,
  onColorChange,
}: ProductInfoProps) {
  // Color no controlado — solo se usa si el padre no gestiona el estado.
  const [internalColor, setInternalColor] = useState<string>(
    product.variants[0]?.color ?? ""
  )
  const selectedColor = controlledColor ?? internalColor
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [sizeModalOpen, setSizeModalOpen] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const { addItem, openCart } = useCart()
  const { toasts, dismissToast } = useToast()
  const router = useRouter()

  const basePrice = Number(product.basePrice)
  const salePrice = product.salePrice ? Number(product.salePrice) : null
  const savings = salePrice ? basePrice - salePrice : null

  const familyColorSummary = buildProductFamilyCardColorSummary([
    product,
    ...(product.colorSiblings ?? []),
  ])
  const sizesForColor = selectedColor ? getUniqueSizes(product.variants, selectedColor) : []
  const availability = getProductAvailability(
    product.availableOnline !== false,
    product.variants.some((variant) => variant.stock > 0)
  )

  const handleColorSelect = useCallback((color: string) => {
    setInternalColor(color)
    onColorChange?.(color)
    setSelectedSize("") // reset size when color changes
  }, [onColorChange])

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
    // Miniatura del carrito: la primera foto del color elegido, no la del producto.
    const colorImages = filterImagesByColor(product.images, selectedColor)
    return {
      id: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      imageUrl: getPrimaryImageUrl(colorImages),
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
    trackMetaEvent("AddToCart", {
      content_type: "product",
      content_ids: [cartItem.productId],
      content_name: cartItem.name,
      contents: [{ id: cartItem.productId, quantity: 1, item_price: cartItem.price }],
      value: cartItem.price,
      currency: META_CURRENCY,
    })
    // El drawer abierto ya confirma la acción; un aviso encima tapaba su botón de checkout en móvil.
    openCart()
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1600)
  }, [selectedSize, triggerShake, buildCartItem, addItem, openCart])

  const handleBuyNow = useCallback(() => {
    if (!selectedSize) {
      triggerShake()
      return
    }
    const cartItem = buildCartItem()
    if (!cartItem) return
    addItem(cartItem)
    trackMetaEvent("AddToCart", {
      content_type: "product",
      content_ids: [cartItem.productId],
      content_name: cartItem.name,
      contents: [{ id: cartItem.productId, quantity: 1, item_price: cartItem.price }],
      value: cartItem.price,
      currency: META_CURRENCY,
    })
    router.push("/checkout")
  }, [selectedSize, triggerShake, buildCartItem, addItem, router])

  const focusSizeSelector = useCallback(() => {
    document.getElementById("selector-talla")?.scrollIntoView({ behavior: "smooth", block: "center" })
    triggerShake()
  }, [triggerShake])

  const canAct = Boolean(selectedSize)

  // Existencias por sede de la talla elegida. Solo informativo: la web no
  // aparta unidades de tienda; quien las quiera debe comprarlas allí.
  const selectedVariant = selectedSize
    ? product.variants.find((v) => v.color === selectedColor && v.size === selectedSize)
    : undefined
  const storeStock = selectedVariant ? getVariantStoreStock(selectedVariant.inventory) : []

  // Mensajes de confianza y urgencia (HU-12), calculados con datos reales.
  const shippingRates = useShippingRates()
  const deliveryDays = useDeliveryDays()
  const conversionSignals = getConversionSignals({
    price: salePrice ?? basePrice,
    selectedVariantStock: selectedVariant ? selectedVariant.stock : null,
    selectedSize,
    totalStock: product.variants
      .filter((v) => v.color === selectedColor)
      .reduce((sum, v) => sum + Math.max(0, v.stock), 0),
    isDigital: product.category?.slug === GIFT_CARD_CATEGORY_SLUG,
    freeThreshold: shippingRates.freeThreshold,
    delivery: deliveryDays,
  })

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex flex-col gap-5"
        variants={containerVariants}
        initial={false}
        animate="show"
      >
        {/* Brand */}
        {product.brand && (
          <motion.div variants={itemVariants}>
            <Link
              href={`/buscar?marca=${encodeURIComponent(product.brand)}`}
              className="inline-flex min-h-11 min-w-11 items-center font-montserrat text-xs uppercase tracking-widest text-[#4A4A4A] transition-colors hover:text-[#1C1C1C]"
            >
              {product.brand}
            </Link>
          </motion.div>
        )}

        {/* Name + badge */}
        <motion.div variants={itemVariants} className="flex items-start gap-3 flex-wrap">
          <h1 className="font-barlow font-bold text-2xl md:text-3xl text-[#1C1C1C] dark:text-white leading-tight flex-1">
            {product.name}
          </h1>
          {product.isOnSale && (
            <span className="flex-shrink-0 mt-1 bg-[#E31C23] text-white font-barlow font-bold text-xs uppercase tracking-widest px-2 py-1 rounded-sm">
              SALE
            </span>
          )}
          {!product.isOnSale && product.isNew && (
            <span className="flex-shrink-0 mt-1 bg-[#1C1C1C] dark:bg-white text-white dark:text-black font-barlow font-bold text-xs uppercase tracking-widest px-2 py-1 rounded-sm">
              NUEVO
            </span>
          )}
          {product.availableOnline === false && (
            <span className="flex-shrink-0 mt-1 bg-[#F5C518] text-[#1C1C1C] font-barlow font-bold text-xs uppercase tracking-widest px-2 py-1 rounded-sm">
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
                  transition={{ type: "spring", stiffness: 500, damping: 45, delay: 0.3 + star * 0.06 }}
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </motion.svg>
              ))}
            </div>
            <span className="font-montserrat text-sm font-semibold text-[#1C1C1C] dark:text-white">
              {reviewStats.avg.toFixed(1)}
            </span>
            <a
              href="#resenas"
              className="font-montserrat text-xs text-[#4A4A4A] underline underline-offset-2 hover:text-[#1C1C1C] dark:text-gray-400 dark:hover:text-white"
            >
              Ver {reviewStats.count} reseña{reviewStats.count !== 1 ? "s" : ""}
            </a>
          </motion.div>
        )}

        {/* Price */}
        <motion.div variants={itemVariants} className="flex flex-col gap-1">
          {product.isOnSale && salePrice ? (
            <div className="flex items-center gap-3">
              <span className="font-barlow font-bold text-3xl text-[#E31C23]">
                {formatCOP(salePrice)}
              </span>
              <span className="font-montserrat text-[#4A4A4A] text-lg line-through">
                {formatCOP(basePrice)}
              </span>
            </div>
          ) : (
            <span className="font-barlow font-bold text-3xl text-[#1C1C1C] dark:text-white">
              {formatCOP(basePrice)}
            </span>
          )}
          {savings && savings > 0 && (
            <p className="font-montserrat text-sm text-green-600 font-medium">
              Ahorras {formatCOP(savings)}
            </p>
          )}
        </motion.div>

        <div
          data-testid="product-availability"
          className={`rounded-[var(--store-radius-md)] border px-3 py-2 font-montserrat text-sm ${
            availability.tone === "available"
              ? "border-emerald-700/25 bg-emerald-50 text-emerald-950"
              : availability.tone === "store-only"
                ? "border-amber-600/30 bg-amber-50 text-amber-950"
                : "border-[var(--store-line)] bg-[var(--store-surface-muted)] text-[var(--store-ink)]"
          }`}
          aria-live="polite"
        >
          <span className="font-semibold">{availability.label}</span>
          <span className="ml-1 text-xs">{availability.detail}</span>
        </div>

        {/* Beneficios clave: lo que el cliente gana, a la vista antes de decidir */}
        {product.highlights.length > 0 && (
          <motion.ul variants={itemVariants} className="flex flex-col gap-2" aria-label="Beneficios principales">
            {product.highlights.slice(0, 4).map(splitHighlight).map(({ title: text }) => (
              <li key={text} className="flex items-start gap-2 font-montserrat text-sm text-[#1C1C1C] dark:text-gray-200">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[#E31C23]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>{text}</span>
              </li>
            ))}
          </motion.ul>
        )}

        {/* Color selector */}
        {familyColorSummary.total > 0 && (
          <motion.div variants={itemVariants} className="flex flex-col gap-2">
            <p className="font-montserrat text-sm font-medium text-[#1C1C1C] dark:text-white">
              Color:{" "}
              <span className="font-normal capitalize text-[#4A4A4A] dark:text-gray-400">{selectedColor.toLowerCase()}</span>
              {familyColorSummary.options.length > 1 && (
                <span className="font-normal text-[#4A4A4A]/70"> · {familyColorSummary.options.length} colores</span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {familyColorSummary.options.map((option) => {
                const belongsToCurrentProduct = option.productId === product.id
                const active = belongsToCurrentProduct && selectedColor === option.name
                // Punto de color (como en las fichas de referencia) con anillo cuando está activo;
                // el nombre aparece al pasar el cursor y lo anuncia el lector de pantalla.
                const className = `group relative grid h-11 w-11 place-items-center rounded-full transition-shadow duration-200 ${
                  active
                    ? "ring-2 ring-[#1C1C1C] ring-offset-2 ring-offset-[var(--store-canvas)]"
                    : "hover:ring-1 hover:ring-[#1C1C1C]/40 hover:ring-offset-2 hover:ring-offset-[var(--store-canvas)]"
                }`
                const content = (
                  <>
                    <span
                      aria-hidden="true"
                      className="block h-8 w-8 rounded-full border border-black/10 shadow-inner"
                      style={getColorSwatchStyle(option.name)}
                    />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-[#1C1C1C] px-2 py-0.5 text-xs capitalize text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {option.name.toLowerCase()}
                    </span>
                  </>
                )

                if (belongsToCurrentProduct) {
                  return (
                    <motion.button
                      key={`${option.productId}-${option.name}`}
                      type="button"
                      onClick={() => handleColorSelect(option.name)}
                      aria-label={`Color ${option.name}`}
                      aria-pressed={active}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className={className}
                    >
                      {content}
                    </motion.button>
                  )
                }

                return (
                  <Link
                    key={`${option.productId}-${option.name}`}
                    href={`/productos/${option.slug}?color=${encodeURIComponent(option.name)}`}
                    prefetch={false}
                    aria-label={`Ver ${option.productName ?? product.name} en color ${option.name}`}
                    className={className}
                  >
                    {content}
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Size selector */}
        <motion.div id="selector-talla" variants={itemVariants} className="flex flex-col gap-2 scroll-mt-24">
          <div className="flex items-center justify-between">
            <p className="font-montserrat text-sm font-medium text-[#1C1C1C] dark:text-white">
              Talla
            </p>
            <button
              onClick={() => setSizeModalOpen(true)}
              className="inline-flex min-h-11 items-center font-montserrat text-sm text-[#4A4A4A] underline underline-offset-2 hover:text-[#1C1C1C] dark:text-gray-400 dark:hover:text-white"
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
                    min-h-11 rounded-store-md border font-montserrat text-sm font-medium
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
                className="font-montserrat text-xs text-[#E31C23] font-semibold"
              >
                Selecciona una talla
              </motion.p>
            )}
          </AnimatePresence>

          {selectedVariant && (
            <div
              className="rounded-lg border border-[#E0E0E0] dark:border-white/10 bg-[#F5F5F5] dark:bg-white/5 px-3 py-2"
              aria-live="polite"
              data-testid="store-stock"
            >
              <p className="font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white">
                Talla {selectedSize}: {selectedVariant.stock > 0
                  ? `${selectedVariant.stock} disponible${selectedVariant.stock !== 1 ? "s" : ""} en total`
                  : "sin unidades disponibles"}
              </p>
              {storeStock.length > 0 ? (
                <>
                  <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {storeStock.map((store) => (
                      <li
                        key={store.id}
                        className="font-montserrat text-xs text-[#4A4A4A] dark:text-gray-300"
                      >
                        <span className="font-semibold text-[#1C1C1C] dark:text-white">{store.name}</span>
                        {store.city ? ` (${store.city})` : ""}: {store.stock}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 font-montserrat text-[11px] text-[#4A4A4A] dark:text-gray-400">
                    El stock de tienda es para compra presencial: la web no lo aparta ni lo reserva.
                  </p>
                </>
              ) : (
                <p className="mt-1 font-montserrat text-[11px] text-[#4A4A4A] dark:text-gray-400">
                  Sin existencias en tiendas físicas para esta talla.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Action buttons */}
        <motion.div id="comprar" variants={itemVariants} className="flex flex-col gap-3 scroll-mt-24">
          {product.availableOnline === false ? (
            <div className="w-full py-4 text-center border-2 border-[#1C1C1C] text-[#1C1C1C] font-barlow font-bold uppercase tracking-widest text-sm bg-[#F5F5F5] dark:border-white dark:text-white dark:bg-white/5">
              Producto exclusivo de tiendas físicas
            </div>
          ) : (
            <>
              <motion.button
                onClick={handleAddToCart}
                aria-disabled={!canAct}
                whileHover={canAct ? { scale: 1.03 } : undefined}
                whileTap={canAct ? { scale: 0.95 } : undefined}
                animate={justAdded ? { scale: [1, 1.08, 0.96, 1] } : { scale: 1 }}
                transition={justAdded ? popTween : springy}
                className={`relative min-h-12 w-full overflow-hidden py-4 font-barlow text-sm font-bold uppercase tracking-widest ${
                  justAdded
                    ? "bg-green-600 text-white"
                    : "bg-[#E31C23] text-white hover:bg-[#C01920]"
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
                        transition={{ type: "spring", stiffness: 500, damping: 45 }}
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
                      Agregar a la bolsa
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                onClick={handleBuyNow}
                aria-disabled={!canAct}
                whileHover={canAct ? { scale: 1.03 } : undefined}
                whileTap={canAct ? { scale: 0.95 } : undefined}
                transition={springy}
                className="min-h-12 w-full border-2 border-[#1C1C1C] bg-transparent py-4 font-barlow text-sm font-bold uppercase tracking-widest text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"
              >
                Comprar Ahora
              </motion.button>
              <ConversionSignals signals={conversionSignals} />
              <ProductTrust promises={promises} whatsappUrl={whatsappUrl} />
            </>
          )}
        </motion.div>

        {/* Accordion: description, extended description, shipping */}
        <motion.div variants={itemVariants} className="flex flex-col divide-y divide-[#E0E0E0] dark:divide-white/10 border-t border-[#E0E0E0] dark:border-white/10">
          {product.description && (
            <AccordionItem title="Descripción">
              <p className="font-montserrat text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
                {product.description}
              </p>
            </AccordionItem>
          )}

          {product.extendedDescription && (
            <AccordionItem title="Descripción extendida">
              <p className="font-montserrat text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {product.extendedDescription}
              </p>
            </AccordionItem>
          )}

          <AccordionItem title="Envío y devoluciones">
            <p className="font-montserrat text-sm text-[#4A4A4A] dark:text-gray-300 leading-relaxed">
              Envío gratis en compras desde {formatCOP(shippingRates.freeThreshold)}. Entregas en todo Colombia de{" "}
              {deliveryDays.min} a {deliveryDays.max} días hábiles. Devoluciones gratuitas dentro de los{" "}
              {RETURN_WINDOW_DAYS} días siguientes a la compra, siempre que el producto esté en su estado original y sin uso.
            </p>
          </AccordionItem>
        </motion.div>
      </motion.div>

      {product.availableOnline !== false && (
        <StickyBuyBar
          targetId="comprar"
          name={product.name}
          price={salePrice ?? basePrice}
          originalPrice={salePrice ? basePrice : null}
          needsSize={!selectedSize}
          onAdd={handleAddToCart}
          onNeedSize={focusSizeSelector}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <SizeGuideModal
        isOpen={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        brand={brand ?? (product.brand ? { name: product.brand } : null)}
        initialGender={product.gender}
      />
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
        <span className="font-barlow font-semibold text-sm uppercase tracking-wider text-[#1C1C1C] dark:text-white">
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
