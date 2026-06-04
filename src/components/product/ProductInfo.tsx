"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ProductWithRelations, Variant } from "@/types/shop"
import SizeGuideModal from "./SizeGuideModal"
import { formatCOP } from "@/lib/shop-utils"
import { useCart } from "@/store"
import { useToast } from "@/hooks/useToast"
import ToastContainer from "@/components/ui/ToastContainer"

interface ProductInfoProps {
  product: ProductWithRelations
}

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

export default function ProductInfo({ product }: ProductInfoProps) {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.variants[0]?.color ?? ""
  )
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [sizeModalOpen, setSizeModalOpen] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)

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
    <>
      <div className="flex flex-col gap-5">
        {/* Brand */}
        {product.brand && (
          <Link
            href={`/buscar?marca=${encodeURIComponent(product.brand)}`}
            className="font-[var(--font-montserrat)] text-xs uppercase tracking-widest text-[#4A4A4A] hover:text-[#1C1C1C] transition-colors w-fit"
          >
            {product.brand}
          </Link>
        )}

        {/* Name + badge */}
        <div className="flex items-start gap-3">
          <h1 className="font-[var(--font-barlow)] font-bold text-2xl md:text-3xl text-[#1C1C1C] leading-tight flex-1">
            {product.name}
          </h1>
          {(product.isOnSale) && (
            <span className="flex-shrink-0 mt-1 bg-[#E31C23] text-white font-[var(--font-barlow)] font-bold text-[10px] uppercase tracking-widest px-2 py-1">
              SALE
            </span>
          )}
          {(!product.isOnSale) && (
            <span className="flex-shrink-0 mt-1 bg-[#1C1C1C] text-white font-[var(--font-barlow)] font-bold text-[10px] uppercase tracking-widest px-2 py-1">
              NUEVO
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1">
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
            <span className="font-[var(--font-barlow)] font-bold text-3xl text-[#1C1C1C]">
              {formatCOP(basePrice)}
            </span>
          )}
          {savings && savings > 0 && (
            <p className="font-[var(--font-montserrat)] text-sm text-green-600 font-medium">
              Ahorras {formatCOP(savings)}
            </p>
          )}
        </div>

        {/* Color selector */}
        {colors.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-[var(--font-montserrat)] text-sm font-medium text-[#1C1C1C]">
              Color:{" "}
              <span className="font-normal text-[#4A4A4A] capitalize">{selectedColor}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  aria-label={`Color ${color}`}
                  className={`w-8 h-8 rounded-full transition-all ${
                    selectedColor === color
                      ? "ring-2 ring-offset-2 ring-[#1C1C1C]"
                      : "ring-1 ring-[#E0E0E0] hover:ring-[#4A4A4A]"
                  }`}
                  style={{ backgroundColor: colorToCSS(color) }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-[var(--font-montserrat)] text-sm font-medium text-[#1C1C1C]">
              Talla
            </p>
            <button
              onClick={() => setSizeModalOpen(true)}
              className="font-[var(--font-montserrat)] text-xs text-[#4A4A4A] underline hover:text-[#1C1C1C] transition-colors"
            >
              Guía de tallas
            </button>
          </div>

          <div
            className={`grid grid-cols-5 gap-2 ${shakeActive ? "animate-shake" : ""}`}
            style={shakeActive ? { animation: "shake 0.5s ease" } : {}}
          >
            {sizesForColor.map((size) => {
              const available = isAvailable(product.variants, selectedColor, size)
              const isActive = selectedSize === size
              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  disabled={!available}
                  aria-label={`Talla ${size}${!available ? " - Agotado" : ""}`}
                  className={`
                    py-2 border font-[var(--font-montserrat)] text-sm font-medium transition-all
                    ${isActive
                      ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                      : available
                        ? "bg-white text-[#1C1C1C] border-[#E0E0E0] hover:bg-[#1C1C1C] hover:text-white hover:border-[#1C1C1C]"
                        : "bg-white text-[#4A4A4A] border-[#E0E0E0] opacity-40 cursor-not-allowed line-through"
                    }
                  `}
                >
                  {size}
                </button>
              )
            })}
          </div>

          {shakeActive && (
            <p className="font-[var(--font-montserrat)] text-xs text-[#E31C23] animate-pulse">
              Selecciona una talla
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAddToCart}
            disabled={!canAct}
            className={`w-full py-4 font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm transition-all ${
              canAct
                ? "bg-[#1C1C1C] text-white hover:bg-[#333]"
                : "bg-[#1C1C1C] text-white opacity-50 cursor-not-allowed"
            }`}
          >
            Agregar al Carrito
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!canAct}
            className={`w-full py-4 font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm transition-all ${
              canAct
                ? "bg-[#E31C23] text-white hover:bg-[#C01920]"
                : "bg-[#E31C23] text-white opacity-50 cursor-not-allowed"
            }`}
          >
            Comprar Ahora
          </button>
        </div>

        {/* Accordion: description, extended description, shipping */}
        <div className="flex flex-col divide-y divide-[#E0E0E0] border-t border-[#E0E0E0]">
          {product.description && (
            <AccordionItem title="Descripción">
              <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] leading-relaxed">
                {product.description}
              </p>
            </AccordionItem>
          )}

          {product.extendedDescription && (
            <AccordionItem title="Descripción extendida">
              <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] leading-relaxed whitespace-pre-line">
                {product.extendedDescription}
              </p>
            </AccordionItem>
          )}

          <AccordionItem title="Envío y devoluciones">
            <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] leading-relaxed">
              Envío gratis en compras mayores a $200.000. Entregas en todo Colombia de 3 a 5 días hábiles.
              Devoluciones gratuitas dentro de los 30 días siguientes a la compra, siempre que el producto
              esté en su estado original y sin uso.
            </p>
          </AccordionItem>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <SizeGuideModal isOpen={sizeModalOpen} onClose={() => setSizeModalOpen(false)} />

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease;
        }
      `}</style>
    </>
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
        <span className="font-[var(--font-barlow)] font-semibold text-sm uppercase tracking-wider text-[#1C1C1C]">
          {title}
        </span>
        <span className="text-[#4A4A4A] transition-transform group-open:rotate-45 ml-2 text-xl leading-none select-none">
          +
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  )
}
