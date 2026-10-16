"use client"

import { useState } from "react"
import { useCart } from "@/store"
import { createGiftCardCartItem, type GiftCardOption } from "@/lib/gift-card"
import { formatCOP } from "@/lib/shop-utils"

interface GiftCardPurchaseProps {
  /**
   * Montos comprables. Vienen del catálogo real: cada uno es un producto con su
   * variante, porque el checkout tasa contra la base de datos.
   */
  options: GiftCardOption[]
}

export default function GiftCardPurchase({ options }: GiftCardPurchaseProps) {
  const addItem = useCart((state) => state.addItem)
  const openCart = useCart((state) => state.openCart)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    options[0]?.variantId ?? null
  )
  const [message, setMessage] = useState("")

  const selectedOption = options.find((option) => option.variantId === selectedVariantId) ?? null

  if (options.length === 0) {
    return (
      <p
        role="status"
        className="border border-[#E0E0E0] dark:border-white/15 px-4 py-6 text-center font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-white/60"
      >
        Las tarjetas de regalo no están disponibles en este momento. Vuelve a intentarlo más tarde.
      </p>
    )
  }

  function selectOption(variantId: string) {
    setSelectedVariantId(variantId)
    setMessage("")
  }

  function handleAddToCart() {
    if (!selectedOption) return
    addItem(createGiftCardCartItem(selectedOption))
    setMessage(`Tarjeta de ${formatCOP(selectedOption.amount)} añadida al carrito.`)
    openCart()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="block text-sm font-bold text-gray-700 dark:text-white mb-2 font-[var(--font-montserrat)]">
          Selecciona el monto
        </p>
        <div
          className="grid grid-cols-3 gap-3"
          role="group"
          aria-label="Monto de la tarjeta de regalo"
        >
          {options.map((option) => {
            const isSelected = option.variantId === selectedVariantId
            return (
              <button
                key={option.variantId}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectOption(option.variantId)}
                className={`border py-3 rounded font-[var(--font-barlow)] font-bold text-lg transition-colors ${
                  isSelected
                    ? "border-[#E31C23] bg-[#E31C23] text-white"
                    : "border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#1b1b1b] text-[#1C1C1C] dark:text-white hover:border-[#1C1C1C] dark:hover:border-white"
                }`}
              >
                {formatCOP(option.amount)}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!selectedOption}
        className="w-full bg-[#E31C23] text-white py-4 font-[var(--font-barlow)] font-bold text-lg uppercase tracking-wider hover:bg-black transition-colors rounded disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selectedOption
          ? `Añadir ${formatCOP(selectedOption.amount)} al carrito`
          : "Selecciona un monto"}
      </button>

      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
