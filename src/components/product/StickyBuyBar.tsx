"use client"

import QuantityStepper from "./QuantityStepper"

interface StickyBuyBarProps {
  needsSize: boolean
  quantity: number
  maxQuantity: number
  onQuantityChange: (value: number) => void
  onAdd: () => void
  onNeedSize: () => void
}

/**
 * Barra fija inferior en móvil, siempre a la vista (como en las fichas de los grandes retailers):
 * cantidad y "Agregar". Si falta la talla, el botón la pide en lugar de fallar en silencio.
 */
export default function StickyBuyBar({ needsSize, quantity, maxQuantity, onQuantityChange, onAdd, onNeedSize }: StickyBuyBarProps) {
  return (
    <div
      role="region"
      aria-label="Compra rápida"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E0E0E0] bg-white/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur dark:border-white/10 dark:bg-[#111]/95 md:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      data-testid="sticky-buy-bar"
    >
      <div className="flex items-center gap-3">
        <QuantityStepper value={quantity} max={maxQuantity} onChange={onQuantityChange} size="sm" />
        <button
          type="button"
          onClick={needsSize ? onNeedSize : onAdd}
          className="min-h-11 flex-1 rounded-full bg-[#E31C23] px-5 font-barlow text-sm font-bold uppercase tracking-widest text-white active:bg-[#C01920]"
        >
          {needsSize ? "Elige tu talla" : "Agregar a la bolsa"}
        </button>
      </div>
    </div>
  )
}
