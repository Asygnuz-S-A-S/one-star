"use client"

import { useState, useTransition } from "react"
import { setAutoPublishReviewsAction } from "@/app/admin/resenas/actions"

/** Elige si las reseñas de clientes salen de una vez o esperan aprobación. El cliente no ve la diferencia. */
export default function AutoPublishReviewsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    const next = !enabled
    setError("")
    setEnabled(next)
    startTransition(async () => {
      const result = await setAutoPublishReviewsAction(next)
      if (!result.success) {
        setEnabled(!next)
        setError(result.error ?? "No se pudo guardar.")
      }
    })
  }

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#1C1C1C]">Publicar reseñas automáticamente</p>
        <p className="mt-1 text-xs text-[#4A4A4A]">
          {enabled
            ? "Las reseñas de clientes salen en la tienda apenas las envían. Puedes ocultarlas o borrarlas aquí."
            : "Las reseñas de clientes llegan a «Pendientes» y salen en la tienda cuando las apruebas."}
          {" "}Al cliente solo se le dice «¡Gracias por tu reseña!».
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Publicar reseñas automáticamente"
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${enabled ? "bg-[#E31C23]" : "bg-gray-300"}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  )
}
