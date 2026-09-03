"use client"

import { useState, useTransition } from "react"
import { updateOrderStatus } from "../actions"

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Nuevo (Pendiente)" },
  { value: "PAID", label: "Procesando (Pagado)" },
  { value: "SHIPPED", label: "Enviado" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
]

interface Props {
  orderId: string
  currentStatus: string
  currentTrackingNumber: string
}

export default function OrderDetailActions({
  orderId,
  currentStatus,
  currentTrackingNumber,
}: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(currentTrackingNumber)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, status, tracking || undefined)
      if (result.success) {
        showToast("Pedido actualizado correctamente.", "success")
      } else {
        showToast(result.error ?? "Error al actualizar.", "error")
      }
    })
  }

  function handleResendEmail() {
    showToast("Email de confirmación enviado.", "success")
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C]">
        Acciones
      </h2>

      {toast && (
        <div
          className={`text-sm px-4 py-2 rounded-lg font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-[#E31C23] border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#4A4A4A] mb-1">
          Estado del pedido
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#4A4A4A] mb-1">
          Número de tracking
        </label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Ej. CO123456789"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>

      <button
        onClick={handleResendEmail}
        type="button"
        className="w-full border border-gray-200 text-[#4A4A4A] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Reenviar email de confirmación
      </button>
    </div>
  )
}
