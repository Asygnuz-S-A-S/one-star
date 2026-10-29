"use client"

import { useEffect, useState } from "react"
import { getAddiWidgetEvaluationAction, startAddiPaymentAction } from "@/server/actions/addi.actions"

interface AddiPayButtonProps {
  orderId: string
  amount: number
  guestToken?: string
}

/** Pagar el pedido a crédito con Addi. Solo aparece si Addi acepta el monto. */
export default function AddiPayButton({ orderId, amount, guestToken }: AddiPayButtonProps) {
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getAddiWidgetEvaluationAction(amount)
      .then((evaluation) => {
        if (!cancelled) setAvailable(Boolean(evaluation?.available && evaluation.inRange))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [amount])

  if (!available) return null

  async function handleClick() {
    setError("")
    setLoading(true)
    try {
      const result = await startAddiPaymentAction({ orderId, guestToken })
      if (result.success) {
        window.location.assign(result.redirectUrl)
        return
      }
      setError(result.error)
    } catch {
      setError("No pudimos conectar con Addi. Intenta de nuevo o usa otro medio de pago.")
    }
    setLoading(false)
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded border border-[#1C1C1C] bg-white py-3 font-barlow text-sm font-bold uppercase tracking-widest text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-white disabled:opacity-60"
      >
        {loading ? "Conectando con Addi..." : "Pagar a cuotas con Addi"}
      </button>
      {error && (
        <p role="alert" className="mt-2 font-montserrat text-xs text-[#E31C23]">
          {error}
        </p>
      )}
    </div>
  )
}
