"use client"

interface AddiWidgetProps {
  price: number
}

const currencyCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

/**
 * Widget informativo de Addi ("Compra a cuotas sin interés con Addi").
 * Muestra el cálculo estimado en 3 o 4 cuotas mensuales sin interés.
 * Se integra de forma limpia y responsiva en la ficha de producto y en el carrito.
 */
export default function AddiWidget({ price }: AddiWidgetProps) {
  if (price < 50000) return null

  // Cálculo de cuotas sin interés representativo de Addi (ej. 3 cuotas)
  const installments = 3
  const installmentValue = Math.round(price / installments)

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#00C389]/30 bg-[#00C389]/5 text-[#1C1C1C] dark:text-gray-200 text-xs font-montserrat">
      <div className="flex items-center justify-center bg-[#00C389] text-white font-bold text-[10px] px-1.5 py-0.5 rounded tracking-wider">
        addi
      </div>
      <div className="flex-1">
        <span>O págalo en <b>{installments} cuotas</b> de <b>{currencyCOP.format(installmentValue)}</b> sin interés.</span>
      </div>
      <span className="text-[11px] text-[#00C389] font-semibold underline underline-offset-2 cursor-pointer hover:opacity-80">
        Conoce más
      </span>
    </div>
  )
}
