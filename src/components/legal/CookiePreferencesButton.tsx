"use client"

import { openCookieBanner } from "@/lib/cookies/consent"

export default function CookiePreferencesButton({
  className = "font-montserrat text-sm text-white/80 underline-offset-2 hover:text-white hover:underline min-h-11 text-left",
}: {
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => openCookieBanner()}
      className={className}
      aria-label="Abrir panel de configuración de cookies"
    >
      Preferencias de cookies
    </button>
  )
}
