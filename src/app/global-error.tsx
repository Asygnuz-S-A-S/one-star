"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#F5F5F5]">
          <h1 className="font-barlow font-bold text-2xl text-[#1C1C1C] uppercase tracking-wide">
            Algo salió mal
          </h1>
          <p className="font-montserrat text-sm text-[#4A4A4A] max-w-sm">
            Ocurrió un error inesperado. Ya fuimos notificados y lo estamos revisando.
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={reset}
              className="bg-[#E31C23] text-white font-barlow font-bold uppercase tracking-widest text-sm px-6 py-3 hover:bg-[#C01920] transition-colors"
            >
              Intentar de nuevo
            </button>
            <Link
              href="/"
              className="border border-[#1C1C1C] text-[#1C1C1C] font-barlow font-bold uppercase tracking-widest text-sm px-6 py-3 hover:bg-[#1C1C1C] hover:text-white transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
