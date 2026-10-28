"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  COOKIE_BANNER_OPEN_EVENT,
  getCookieConsent,
  setCookieConsent,
} from "@/lib/cookies/consent"

const emptySubscribe = () => () => {}

export default function CookieBanner() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [dismissed, setDismissed] = useState(false)
  const [forcedOpen, setForcedOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => {
      setForcedOpen(true)
      setDismissed(false)
    }

    window.addEventListener(COOKIE_BANNER_OPEN_EVENT, handleOpen)
    return () => {
      window.removeEventListener(COOKIE_BANNER_OPEN_EVENT, handleOpen)
    }
  }, [])

  const hasExistingConsent = mounted && getCookieConsent() !== null
  const isOpen = mounted && !dismissed && (forcedOpen || !hasExistingConsent)

  if (!isOpen) return null

  const handleAccept = () => {
    setCookieConsent("accepted")
    setDismissed(true)
    setForcedOpen(false)
  }

  const handleReject = () => {
    setCookieConsent("rejected")
    setDismissed(true)
    setForcedOpen(false)
  }

  return (
    <div
      role="region"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-white/95 dark:bg-[#151515]/95 backdrop-blur-md border-t border-[#E0E0E0] dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-colors duration-200"
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 pr-2">
          <p className="font-barlow font-bold uppercase tracking-wide text-sm text-[#1C1C1C] dark:text-white">
            Tu privacidad y uso de cookies
          </p>
          <p className="font-montserrat text-xs sm:text-sm text-[#4A4A4A] dark:text-white/70 leading-relaxed">
            Utilizamos cookies técnicas necesarias para el funcionamiento de la tienda (sesión, carrito y seguridad) y cookies opcionales de analítica (Google Analytics 4) y publicidad (Meta Pixel) para medir el rendimiento y personalizar contenidos. Puedes aceptar o rechazar las cookies opcionales en cualquier momento. Consulta los detalles en nuestra{" "}
            <Link
              href="/cookies"
              className="text-[#E31C23] underline underline-offset-2 hover:opacity-80 font-medium"
            >
              Política de Cookies
            </Link>{" "}
            y{" "}
            <Link
              href="/privacidad"
              className="text-[#E31C23] underline underline-offset-2 hover:opacity-80 font-medium"
            >
              Política de Privacidad
            </Link>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleReject}
            aria-label="Rechazar cookies opcionales"
            className="min-h-11 px-5 py-2.5 rounded-lg border-2 border-[#1C1C1C] dark:border-white font-montserrat font-semibold text-xs uppercase tracking-wider text-[#1C1C1C] dark:text-white bg-transparent hover:bg-[#1C1C1C]/5 dark:hover:bg-white/10 transition-colors text-center"
          >
            Rechazar opcionales
          </button>
          <button
            type="button"
            onClick={handleAccept}
            aria-label="Aceptar todas las cookies"
            className="min-h-11 px-6 py-2.5 rounded-lg border-2 border-[#E31C23] font-montserrat font-bold text-xs uppercase tracking-wider text-white bg-[#E31C23] hover:bg-[#c9181e] shadow-sm transition-colors text-center"
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  )
}
