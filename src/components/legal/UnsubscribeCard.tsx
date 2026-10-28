"use client"

import { useState } from "react"
import { processUnsubscribeAction } from "@/app/baja-publicidad/actions"
import Link from "next/link"

export default function UnsubscribeCard({
  initialToken,
  initialEmail,
}: {
  initialToken?: string
  initialEmail?: string
}) {
  const [email, setEmail] = useState(initialEmail ?? "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUnsubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await processUnsubscribeAction({
        token: initialToken,
        email: email || undefined,
      })

      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error ?? "No se pudo procesar la baja.")
      }
    } catch {
      setError("Error de conexión. Por favor intenta más tarde.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/70 p-6 md:p-8 dark:border-green-800 dark:bg-green-950/30 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center mx-auto text-green-700 dark:text-green-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-barlow font-bold uppercase tracking-wide text-2xl text-[#1C1C1C] dark:text-white">
          Baja confirmada
        </h3>
        <p className="max-w-md mx-auto font-montserrat text-sm text-[#4A4A4A] dark:text-white/70 leading-relaxed">
          Has sido dado de baja de nuestras comunicaciones comerciales y publicitarias. Ya no recibirás correos de novedades ni ofertas del One Star Club.
        </p>
        <p className="font-montserrat text-xs text-gray-500 dark:text-gray-400">
          (Seguirás recibiendo únicamente las comunicaciones transaccionales indispensables sobre tus pedidos y compras).
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="min-h-11 inline-flex items-center px-6 py-2.5 rounded-lg bg-[#E31C23] text-white text-xs font-montserrat font-bold uppercase tracking-wider hover:bg-[#c9181e] transition-colors"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E0E0E0] dark:border-white/10 bg-white dark:bg-[#151515] p-6 md:p-8 space-y-6">
      <div className="space-y-2">
        <h2 className="font-barlow font-bold uppercase tracking-wide text-xl text-[#1C1C1C] dark:text-white">
          Cancelar suscripción a mensajes comerciales
        </h2>
        <p className="font-montserrat text-xs sm:text-sm text-[#4A4A4A] dark:text-white/70 leading-relaxed">
          Conforme a la Ley 2300 de 2023 y a nuestra Política de Tratamiento de Datos Personales, puedes revocar tu autorización para recibir publicidad o promociones en cualquier momento.
        </p>
      </div>

      <form onSubmit={handleUnsubscribe} className="space-y-4">
        <div>
          <label htmlFor="unsub-email" className="block font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider mb-1.5">
            Correo electrónico
          </label>
          <input
            id="unsub-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full min-h-11 px-3.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
          />
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-montserrat text-[#E31C23] dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-11 py-2.5 px-6 rounded-lg bg-[#E31C23] text-white font-montserrat font-bold text-xs uppercase tracking-wider hover:bg-[#c9181e] disabled:opacity-60 transition-colors shadow-sm"
        >
          {loading ? "Procesando..." : "Confirmar baja de publicidad"}
        </button>
      </form>
    </div>
  )
}
