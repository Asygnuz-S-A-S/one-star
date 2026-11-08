"use client"

/** − cantidad + con tope de stock. Sin talla elegida no se puede subir de 1. */
export default function QuantityStepper({
  value,
  max,
  onChange,
  size = "md",
}: {
  value: number
  max: number
  onChange: (value: number) => void
  size?: "sm" | "md"
}) {
  const box = size === "sm" ? "h-11 w-10" : "h-12 w-11"
  const button = `${box} grid place-items-center font-montserrat text-lg text-[#1C1C1C] disabled:text-[#C8C8C8] dark:text-white`
  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-[#E0E0E0] dark:border-white/20" role="group" aria-label="Cantidad">
      <button type="button" className={button} onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Quitar una unidad">−</button>
      <span className="min-w-6 text-center font-montserrat text-sm font-semibold text-[#1C1C1C] dark:text-white" aria-live="polite">{value}</span>
      <button type="button" className={button} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Agregar una unidad">+</button>
    </div>
  )
}
