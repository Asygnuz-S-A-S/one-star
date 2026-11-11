"use client"

import { useState, useTransition } from "react"
import { updateStorefrontLabelsAction } from "@/app/admin/contenido/actions"
import { STOREFRONT_LABEL_MAX, STOREFRONT_TEXT_MAX, type StorefrontSettings } from "@/lib/storefront-settings"

const field = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1C1C1C] focus:outline-none focus:ring-1 focus:ring-[#1C1C1C]"

/** Textos de la ficha de producto que se cambian sin programar: botones de compra y fila de tiendas. */
export default function StorefrontLabelsForm({ initial }: { initial: StorefrontSettings }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setMessage(null)
    startTransition(async () => {
      const result = await updateStorefrontLabelsAction(formData)
      setMessage(result.success ? { ok: true, text: "Textos guardados. Ya se ven en la tienda." } : { ok: false, text: result.error ?? "No se pudo guardar." })
    })
  }

  return (
    <form id="textos-ficha" onSubmit={onSubmit} className="mb-10 scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C]">Textos de la ficha de producto</h2>
      <p className="mb-5 mt-1 text-sm text-[#4A4A4A]">Lo que dicen los botones de compra y la fila de tiendas en todos los productos.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">Botón principal</span>
          <input name="addToCartLabel" defaultValue={initial.addToCartLabel} maxLength={STOREFRONT_LABEL_MAX} required className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">Botón de compra directa</span>
          <input name="buyNowLabel" defaultValue={initial.buyNowLabel} maxLength={STOREFRONT_LABEL_MAX} required className={field} />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">Texto de «Stock en tienda»</span>
          <input name="storeStockText" defaultValue={initial.storeStockText} maxLength={STOREFRONT_TEXT_MAX} required className={field} />
          <span className="mt-1 block text-xs text-gray-500">También aparece en el bloque «Disponibilidad» al final de la ficha.</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-md bg-[#1C1C1C] px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar textos"}
        </button>
        {message && <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`} role="status">{message.text}</p>}
      </div>
    </form>
  )
}
