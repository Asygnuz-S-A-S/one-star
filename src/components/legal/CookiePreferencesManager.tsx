"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  COOKIE_CONSENT_EVENT,
  getCookieConsent,
  setCookieConsent,
  type CookieConsentStatus,
} from "@/lib/cookies/consent"

const emptySubscribe = () => () => {}

export default function CookiePreferencesManager() {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [consent, setConsent] = useState<CookieConsentStatus | null>(() => getCookieConsent())
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    const handleConsent = (event: Event) => {
      const custom = event as CustomEvent<{ consent: CookieConsentStatus }>
      setConsent(custom.detail?.consent ?? null)
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsent)
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsent)
    }
  }, [])

  if (!mounted) return null

  const handleUpdate = (status: CookieConsentStatus) => {
    setCookieConsent(status)
    setConsent(status)
    setFeedback(
      status === "accepted"
        ? "Has aceptado las cookies de analítica y publicidad."
        : "Has rechazado las cookies opcionales. Solo operarán las cookies técnicas necesarias."
    )
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div className="rounded-xl border border-[#E0E0E0] dark:border-white/10 bg-[#FAFAFA] dark:bg-white/5 p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E0E0E0] dark:border-white/10 pb-4">
        <div>
          <h3 className="font-barlow font-bold uppercase text-base text-[#1C1C1C] dark:text-white">
            Tus preferencias actuales
          </h3>
          <p className="font-montserrat text-xs text-[#4A4A4A] dark:text-white/60">
            Gestiona tu consentimiento en cualquier momento.
          </p>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="font-montserrat text-xs font-semibold uppercase tracking-wider text-[#4A4A4A] dark:text-white/60">
            Estado:
          </span>
          {consent === "accepted" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-montserrat font-semibold bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border border-green-200 dark:border-green-800">
              <span className="h-2 w-2 rounded-full bg-green-600" />
              Aceptadas (Analítica y Publicidad activas)
            </span>
          ) : consent === "rejected" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-montserrat font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              Rechazadas (Solo necesarias)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-montserrat font-semibold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70">
              Sin configurar
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleUpdate("accepted")}
          className={`min-h-11 px-5 py-2.5 rounded-lg font-montserrat font-bold text-xs uppercase tracking-wider transition-colors ${
            consent === "accepted"
              ? "bg-[#E31C23] text-white shadow"
              : "border border-[#E31C23] text-[#E31C23] hover:bg-[#E31C23]/5"
          }`}
        >
          Aceptar todas (Analítica y Publicidad)
        </button>
        <button
          type="button"
          onClick={() => handleUpdate("rejected")}
          className={`min-h-11 px-5 py-2.5 rounded-lg font-montserrat font-bold text-xs uppercase tracking-wider transition-colors ${
            consent === "rejected"
              ? "bg-[#1C1C1C] text-white dark:bg-white dark:text-[#1C1C1C] shadow"
              : "border border-[#1C1C1C] dark:border-white text-[#1C1C1C] dark:text-white hover:bg-[#1C1C1C]/5 dark:hover:bg-white/5"
          }`}
        >
          Rechazar opcionales (Solo necesarias)
        </button>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 p-3 font-montserrat text-xs text-green-800 dark:text-green-300 animate-fadeIn"
        >
          {feedback}
        </div>
      )}
    </div>
  )
}
