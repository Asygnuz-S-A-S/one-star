"use client"

import { useState, useTransition, useRef } from "react"
import { createCoupon } from "@/app/admin/cupones/actions"

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
  onClose: () => void
}

export default function CouponForm({ categories, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE")
  const [isActive, setIsActive] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    formData.set("discountType", discountType)
    formData.set("isActive", String(isActive))

    startTransition(async () => {
      const result = await createCoupon(formData)
      if (result.success) {
        onClose()
      } else {
        setError(result.error ?? "Error desconocido.")
      }
    })
  }

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
  const labelClass = "block text-xs font-semibold text-[#4A4A4A] mb-1"

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm px-4 py-2 rounded-lg bg-red-50 text-[#E31C23] border border-red-200">
          {error}
        </div>
      )}

      {/* Código */}
      <div>
        <label className={labelClass}>Código del cupón *</label>
        <input
          type="text"
          name="code"
          required
          placeholder="VERANO20"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase()
          }}
          className={inputClass}
        />
      </div>

      {/* Tipo de descuento */}
      <div>
        <p className={labelClass}>Tipo de descuento *</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-[#1C1C1C] cursor-pointer">
            <input
              type="radio"
              name="discountTypeRadio"
              checked={discountType === "PERCENTAGE"}
              onChange={() => setDiscountType("PERCENTAGE")}
              className="accent-[#E31C23]"
            />
            Porcentaje
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1C1C1C] cursor-pointer">
            <input
              type="radio"
              name="discountTypeRadio"
              checked={discountType === "FIXED_AMOUNT"}
              onChange={() => setDiscountType("FIXED_AMOUNT")}
              className="accent-[#E31C23]"
            />
            Monto fijo
          </label>
        </div>
      </div>

      {/* Valor */}
      <div>
        <label className={labelClass}>
          Valor del descuento{" "}
          <span className="text-[#4A4A4A] font-normal">
            ({discountType === "PERCENTAGE" ? "%" : "$"})
          </span>{" "}
          *
        </label>
        <div className="relative">
          <input
            type="number"
            name="discountValue"
            required
            min={0}
            step="any"
            placeholder={discountType === "PERCENTAGE" ? "20" : "50000"}
            className={`${inputClass} pr-8`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#4A4A4A]">
            {discountType === "PERCENTAGE" ? "%" : "$"}
          </span>
        </div>
      </div>

      {/* Pedido mínimo */}
      <div>
        <label className={labelClass}>Pedido mínimo (opcional, COP)</label>
        <input
          type="number"
          name="minOrderAmount"
          min={0}
          placeholder="100000"
          className={inputClass}
        />
      </div>

      {/* Máx usos */}
      <div>
        <label className={labelClass}>Máximo de usos (vacío = ilimitado)</label>
        <input
          type="number"
          name="maxUses"
          min={1}
          placeholder="100"
          className={inputClass}
        />
      </div>

      {/* Categoría */}
      <div>
        <label className={labelClass}>Categoría aplicable (vacío = todas)</label>
        <select name="categoryId" className={inputClass}>
          <option value="">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Válido desde *</label>
          <input
            type="date"
            name="validFrom"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Válido hasta *</label>
          <input
            type="date"
            name="validUntil"
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Activo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-[#E31C23]" : "bg-gray-300"
          }`}
          aria-label="Toggle activo"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-[#4A4A4A]">{isActive ? "Activo" : "Inactivo"}</span>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Creando…" : "Crear cupón"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-200 text-[#4A4A4A] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
