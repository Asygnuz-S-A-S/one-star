"use client"

import { useState, useTransition } from "react"
import {
  cancelUnpaidOrderAction,
  resendOrderConfirmationAction,
  updateOrderStatus,
} from "../actions"
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status"

interface Props {
  orderId: string
  currentStatus: string
  paymentStatus: string
  currentTrackingNumber: string
  hasCustomerEmail: boolean
}

type Toast = { message: string; type: "success" | "error" }

export default function OrderDetailActions({
  orderId,
  currentStatus,
  paymentStatus,
  currentTrackingNumber,
  hasCustomerEmail,
}: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(currentTrackingNumber)
  const [toast, setToast] = useState<Toast | null>(null)
  const [isPending, startTransition] = useTransition()

  const isPaid = paymentStatus === "APPROVED"
  const canCancelUnpaid = !isPaid && currentStatus !== "CANCELLED"

  function showToast(message: string, type: Toast["type"]) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
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

  function handleCancelUnpaid() {
    const confirmed = window.confirm(
      "¿Cancelar este pedido? Quedará registrado como no pagado y el cupón (si lo hubo) se libera."
    )
    if (!confirmed) return
    startTransition(async () => {
      const result = await cancelUnpaidOrderAction(orderId)
      if (result.success) {
        setStatus("CANCELLED")
        showToast("Pedido cancelado por falta de pago.", "success")
      } else {
        showToast(result.error ?? "No se pudo cancelar.", "error")
      }
    })
  }

  function handleResendEmail() {
    startTransition(async () => {
      const result = await resendOrderConfirmationAction(orderId)
      if (result.success) {
        showToast("Email de confirmación reenviado.", "success")
      } else {
        showToast(result.error ?? "No se pudo reenviar el correo.", "error")
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C]">
        Acciones
      </h2>

      {toast && (
        <div
          role="status"
          className={`text-sm px-4 py-2 rounded-lg font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-[#E31C23] border border-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {canCancelUnpaid && (
        <button
          type="button"
          onClick={handleCancelUnpaid}
          disabled={isPending}
          className="w-full border border-[#E31C23] text-[#E31C23] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          Cancelar pedido (pago no recibido)
        </button>
      )}

      <div>
        <label htmlFor="order-status" className="block text-xs font-semibold text-[#4A4A4A] mb-1">
          Estado del pedido
        </label>
        <select
          id="order-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        >
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        {!isPaid && status === "PAID" && (
          <p className="mt-1 text-xs text-yellow-800">
            Marcar como pagado descuenta el stock y registra el pago como aprobado manualmente.
            Hazlo solo si verificaste el cobro en el panel de ePayco.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="order-tracking" className="block text-xs font-semibold text-[#4A4A4A] mb-1">
          Número de tracking
        </label>
        <input
          id="order-tracking"
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Ej. CO123456789"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        {isPending ? "Guardando…" : "Guardar cambios"}
      </button>

      <button
        onClick={handleResendEmail}
        type="button"
        disabled={isPending || !isPaid || !hasCustomerEmail}
        title={
          !isPaid
            ? "Solo se envía confirmación de pedidos con pago aprobado"
            : !hasCustomerEmail
              ? "El pedido no tiene correo del cliente"
              : undefined
        }
        className="w-full border border-gray-200 text-[#4A4A4A] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Reenviar email de confirmación
      </button>
    </div>
  )
}
