"use client"

import { useState } from "react"
import { useCart } from "@/store"
import {
  createGiftCardCartItem,
  GIFT_CARD_AMOUNTS,
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
} from "@/lib/gift-card"
import { formatCOP } from "@/lib/shop-utils"

const DEFAULT_AMOUNT = GIFT_CARD_AMOUNTS[1]

export default function GiftCardPurchase() {
  const addItem = useCart((state) => state.addItem)
  const openCart = useCart((state) => state.openCart)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(DEFAULT_AMOUNT)
  const [isCustom, setIsCustom] = useState(false)
  const [customAmount, setCustomAmount] = useState("")
  const [message, setMessage] = useState("")

  const customValue = Number(customAmount)
  const amount = isCustom ? customValue : selectedAmount
  const isValidAmount =
    amount !== null &&
    Number.isInteger(amount) &&
    amount >= GIFT_CARD_MIN_AMOUNT &&
    amount <= GIFT_CARD_MAX_AMOUNT

  function selectPreset(value: number) {
    setIsCustom(false)
    setCustomAmount("")
    setSelectedAmount(value)
    setMessage("")
  }

  function selectCustom() {
    setIsCustom(true)
    setSelectedAmount(null)
    setMessage("")
  }

  function handleAddToCart() {
    if (!isValidAmount || amount === null) return
    addItem(createGiftCardCartItem(amount))
    setMessage(`Tarjeta de ${formatCOP(amount)} añadida al carrito.`)
    openCart()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="block text-sm font-bold text-gray-700 dark:text-white mb-2 font-[var(--font-montserrat)]">
          Selecciona el monto
        </p>
        <div className="grid grid-cols-3 gap-3" role="group" aria-label="Monto de la tarjeta de regalo">
          {GIFT_CARD_AMOUNTS.map((amountOption) => {
            const isSelected = !isCustom && selectedAmount === amountOption
            return (
              <button
                key={amountOption}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectPreset(amountOption)}
                className={`border py-3 rounded font-[var(--font-barlow)] font-bold text-lg transition-colors ${
                  isSelected
                    ? "border-[#E31C23] bg-[#E31C23] text-white"
                    : "border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#1b1b1b] text-[#1C1C1C] dark:text-white hover:border-[#1C1C1C] dark:hover:border-white"
                }`}
              >
                {formatCOP(amountOption)}
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={isCustom}
            onClick={selectCustom}
            className={`border py-3 rounded font-[var(--font-barlow)] font-bold text-lg transition-colors ${
              isCustom
                ? "border-[#E31C23] bg-[#E31C23] text-white"
                : "border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#1b1b1b] text-[#1C1C1C] dark:text-white hover:border-[#1C1C1C] dark:hover:border-white"
            }`}
          >
            Otro
          </button>
        </div>

        {isCustom && (
          <div className="mt-4">
            <label
              htmlFor="gift-card-custom-amount"
              className="block text-sm font-bold text-gray-700 dark:text-white mb-2 font-[var(--font-montserrat)]"
            >
              Monto personalizado
            </label>
            <input
              id="gift-card-custom-amount"
              type="number"
              inputMode="numeric"
              min={GIFT_CARD_MIN_AMOUNT}
              max={GIFT_CARD_MAX_AMOUNT}
              step="1000"
              value={customAmount}
              onChange={(event) => {
                setCustomAmount(event.target.value)
                setMessage("")
              }}
              placeholder="$20.000 – $2.000.000"
              className="w-full border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#1b1b1b] px-4 py-3 text-[#1C1C1C] dark:text-white rounded focus:outline-none focus:border-[#E31C23]"
            />
            {customAmount && !isValidAmount && (
              <p className="mt-2 text-xs text-[#E31C23] font-[var(--font-montserrat)]">
                Ingresa un monto entre {formatCOP(GIFT_CARD_MIN_AMOUNT)} y {formatCOP(GIFT_CARD_MAX_AMOUNT)}.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!isValidAmount}
        className="w-full bg-[#E31C23] text-white py-4 font-[var(--font-barlow)] font-bold text-lg uppercase tracking-wider hover:bg-black transition-colors rounded disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isValidAmount && amount !== null
          ? `Añadir ${formatCOP(amount)} al carrito`
          : "Selecciona un monto válido"}
      </button>

      <p className="sr-only" aria-live="polite">{message}</p>
    </div>
  )
}
