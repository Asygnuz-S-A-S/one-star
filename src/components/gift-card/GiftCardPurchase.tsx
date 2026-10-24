"use client"

import { useRef, useState, type PointerEvent, type ReactNode } from "react"
import Image from "next/image"
import { useCart } from "@/store"
import { createGiftCardCartItem, getGiftCardFinish, type GiftCardFinish, type GiftCardOption } from "@/lib/gift-card"
import { formatCOP } from "@/lib/shop-utils"

interface GiftCardPurchaseProps {
  /**
   * Montos comprables. Vienen del catálogo real: cada uno es un producto con su
   * variante, porque el checkout tasa contra la base de datos.
   */
  options: GiftCardOption[]
  /** Título y texto de la página, junto al selector. */
  intro: ReactNode
}

const STEPS = [
  { title: "Elige el monto", detail: "Desde el valor que prefieras." },
  { title: "Paga seguro", detail: "Con ePayco: tarjeta, PSE o efectivo." },
  { title: "Llega al correo", detail: "Con un código digital válido por 12 meses." },
]

const FINISHES: Record<GiftCardFinish, { label: string; base: string; ink: string; muted: string; logo: "light" | "dark"; swatch: string }> = {
  copper: {
    label: "Cobre",
    base: "bg-[linear-gradient(135deg,#5a2d16_0%,#b8683a_28%,#e8a477_46%,#a35a2e_62%,#4a230f_100%)]",
    ink: "text-white", muted: "text-white/70", logo: "dark",
    swatch: "bg-[linear-gradient(135deg,#7a3d1d,#e8a477,#8a4a24)]",
  },
  silver: {
    label: "Plata",
    base: "bg-[linear-gradient(135deg,#8d9196_0%,#e9ebee_28%,#ffffff_45%,#b9bdc2_62%,#6f7378_100%)]",
    ink: "text-[#1C1C1C]", muted: "text-[#1C1C1C]/60", logo: "light",
    swatch: "bg-[linear-gradient(135deg,#9a9ea3,#ffffff,#8a8e93)]",
  },
  gold: {
    label: "Oro",
    base: "bg-[linear-gradient(135deg,#7a5410_0%,#d6a73a_26%,#fbe7a1_45%,#c8922a_62%,#6b470b_100%)]",
    ink: "text-[#1C1C1C]", muted: "text-[#1C1C1C]/60", logo: "light",
    swatch: "bg-[linear-gradient(135deg,#a8771c,#fbe7a1,#a8771c)]",
  },
}

/**
 * Tarjeta metálica en 3D: el acabado cambia con el monto (cobre, plata, oro), gira siguiendo
 * el puntero con un brillo que recorre el metal y, sin puntero, se balancea sola.
 */
function GiftCardVisual({ amount, finish }: { amount: number | null; finish: GiftCardFinish }) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const style = FINISHES[finish]

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current
    if (!el || event.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    el.style.setProperty("--ry", `${(x - 0.5) * 28}deg`)
    el.style.setProperty("--rx", `${(y - 0.5) * -18}deg`)
    el.style.setProperty("--sheen", `${x * 100}%`)
  }
  const reset = () => {
    tiltRef.current?.style.setProperty("--ry", "0deg")
    tiltRef.current?.style.setProperty("--rx", "0deg")
    tiltRef.current?.style.setProperty("--sheen", "50%")
  }

  return (
    <div className="relative mx-auto w-full max-w-md [perspective:1100px]" onPointerMove={tilt} onPointerLeave={reset} data-testid="gift-card-visual" data-finish={finish}>
      <div className="motion-safe:animate-[gift-card-idle_7s_ease-in-out_infinite] [transform-style:preserve-3d]">
        <div
          ref={tiltRef}
          className="relative aspect-[1.6/1] w-full transition-transform duration-300 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]"
        >
          {/* Canto de la tarjeta: una capa oscura detrás da grosor al girar. */}
          <div aria-hidden="true" className="absolute inset-0 translate-y-1.5 rounded-[var(--store-radius-xl)] bg-black/35 blur-[1px] [transform:translateZ(-6px)]" />

          <div className="absolute inset-0 overflow-hidden rounded-[var(--store-radius-xl)] shadow-[0_34px_60px_-24px_rgb(0_0_0/0.6)]">
            {/* Los tres metales quedan apilados y cambian con un fundido. */}
            {(Object.keys(FINISHES) as GiftCardFinish[]).map((key) => (
              <div key={key} aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 ${FINISHES[key].base} ${key === finish ? "opacity-100" : "opacity-0"}`} />
            ))}
            {/* Cepillado del metal y brillo que sigue al puntero. */}
            <div aria-hidden="true" className="absolute inset-0 opacity-25 mix-blend-overlay bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.35)_0px,rgba(0,0,0,0.15)_1px,rgba(255,255,255,0.2)_2px)]" />
            <div aria-hidden="true" className="absolute inset-0 mix-blend-soft-light [background-image:linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.85)_50%,transparent_70%)] [background-size:250%_100%] [background-position:var(--sheen,50%)_0] transition-[background-position] duration-300 motion-safe:animate-[gift-card-sheen_7s_ease-in-out_infinite]" />
            <span aria-hidden="true" className={`absolute -right-6 -bottom-10 font-barlow text-[9rem] font-black leading-none opacity-10 ${style.ink}`}>★</span>
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#E31C23]" />

            <div className={`relative flex h-full flex-col justify-between p-6 sm:p-8 ${style.ink}`}>
              <div className="flex items-start justify-between">
                {/* Logo según el fondo: el negativo (fondo negro) con screen en cobre; el positivo (fondo blanco) con multiply en plata y oro. */}
                <div className="relative h-12 w-20 overflow-hidden">
                  {style.logo === "dark" ? (
                    <Image src="/logos/negativo.svg" alt="One Star" fill className="scale-[1.3] object-contain mix-blend-screen" />
                  ) : (
                    <Image src="/logos/logopositivo.svg" alt="One Star" fill className="object-contain object-left mix-blend-multiply" />
                  )}
                </div>
                <span className={`text-right font-barlow text-xs font-semibold uppercase tracking-[0.24em] ${style.muted}`}>
                  Gift card
                  <span key={finish} className="block text-[10px] tracking-[0.3em] motion-safe:animate-[hero-copy-swap_400ms_cubic-bezier(.22,1,.36,1)]">{style.label}</span>
                </span>
              </div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className={`font-montserrat text-[10px] uppercase tracking-[0.2em] ${style.muted}`}>Valor</p>
                  <p key={amount ?? 0} className="font-barlow text-4xl font-extrabold tracking-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.25)] motion-safe:animate-[hero-copy-swap_400ms_cubic-bezier(.22,1,.36,1)] sm:text-5xl">
                    {amount ? formatCOP(amount) : "—"}
                  </p>
                </div>
                <p className={`font-mono text-xs tracking-[0.2em] ${style.muted}`}>**** ****</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto mt-6 h-4 w-3/4 rounded-[50%] bg-black/20 blur-md motion-safe:animate-[store-float-shadow_7s_ease-in-out_infinite]" />
    </div>
  )
}

export default function GiftCardPurchase({ options, intro }: GiftCardPurchaseProps) {
  const addItem = useCart((state) => state.addItem)
  const openCart = useCart((state) => state.openCart)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    options[0]?.variantId ?? null
  )
  const [message, setMessage] = useState("")

  const selectedOption = options.find((option) => option.variantId === selectedVariantId) ?? null
  const amounts = options.map((option) => option.amount)
  const finish = selectedOption ? getGiftCardFinish(selectedOption.amount, amounts) : "copper"

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
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <div className="rounded-[var(--store-radius-xl)] bg-[radial-gradient(ellipse_at_50%_40%,#ffffff_0%,#f2f2f0_70%)] px-6 py-10 sm:px-10 sm:py-14">
        <GiftCardVisual amount={selectedOption?.amount ?? null} finish={finish} />
      </div>

      <div className="space-y-8">
        {intro}

        {options.length === 0 ? (
          <p
            role="status"
            className="rounded-[var(--store-radius-md)] border border-[#E0E0E0] px-4 py-6 text-center font-montserrat text-sm text-[#4A4A4A] dark:border-white/15 dark:text-white/60"
          >
            Las tarjetas de regalo no están disponibles en este momento. Vuelve a intentarlo más tarde.
          </p>
        ) : (
          <>
            <div>
              <p className="mb-3 font-montserrat text-sm font-semibold text-[#1C1C1C] dark:text-white">
                Selecciona el monto
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Monto de la tarjeta de regalo">
                {options.map((option) => {
                  const isSelected = option.variantId === selectedVariantId
                  return (
                    <button
                      key={option.variantId}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectOption(option.variantId)}
                      className={`min-h-14 rounded-[var(--store-radius-md)] border font-barlow text-lg font-bold transition-[border-color,box-shadow,background-color] ${
                        isSelected
                          ? "border-[#1C1C1C] bg-white text-[#1C1C1C] shadow-[0_0_0_1px_#1C1C1C]"
                          : "border-[#E0E0E0] bg-white text-[#1C1C1C] hover:border-[#1C1C1C] dark:border-white/20 dark:bg-[#1b1b1b] dark:text-white"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className={`h-3 w-3 rounded-full ring-1 ring-black/10 ${FINISHES[getGiftCardFinish(option.amount, amounts)].swatch}`} />
                        {formatCOP(option.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedOption}
              className="min-h-14 w-full rounded-[var(--store-radius-md)] bg-[#E31C23] font-barlow text-lg font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#C01920] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedOption
                ? `Añadir ${formatCOP(selectedOption.amount)} al carrito`
                : "Selecciona un monto"}
            </button>
          </>
        )}

        <ol className="grid gap-4 border-t border-[#E0E0E0] pt-6 sm:grid-cols-3 dark:border-white/10" aria-label="Cómo funciona">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 sm:flex-col sm:gap-2">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1C1C1C] font-barlow text-xs font-bold text-white">{index + 1}</span>
              <span>
                <span className="block font-barlow text-sm font-bold uppercase tracking-[0.06em] text-[#1C1C1C] dark:text-white">{step.title}</span>
                <span className="block font-montserrat text-xs text-[#4A4A4A] dark:text-white/60">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>

        <p className="sr-only" aria-live="polite">
          {message}
        </p>
      </div>
    </div>
  )
}
