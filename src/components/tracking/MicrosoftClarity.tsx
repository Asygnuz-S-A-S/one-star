"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useCspNonce } from "@/app/providers"
import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookies/consent"

interface MicrosoftClarityProps {
  projectId?: string | null
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function isValidClarityId(id: string): boolean {
  return /^[a-z0-9_-]{4,32}$/i.test(id.trim())
}

/**
 * Componente oficial de Microsoft Clarity (Heatmaps & Session Recording).
 *
 * Características:
 * - Proporciona mapas de calor de clics, desplazamientos y grabaciones de sesión 100% gratuitas.
 * - Solo se carga si `projectId` está definido y el usuario otorgó consentimiento de cookies.
 * - Soporta nonce CSP y se ejecuta de forma asíncrona tras la interactividad.
 * - Omite tracking en rutas administrativas (/admin/*).
 * - Falla cerrado (null) si no hay variable configurada.
 */
export default function MicrosoftClarity({ projectId }: MicrosoftClarityProps) {
  const nonce = useCspNonce()
  const pathname = usePathname()
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    return typeof document !== "undefined" && getCookieConsent() === "accepted"
  })

  useEffect(() => {
    const handleConsent = (event: Event) => {
      const custom = event as CustomEvent<{ consent: string }>
      setHasConsent(custom.detail?.consent === "accepted")
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsent)
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsent)
    }
  }, [])

  if (!projectId) return null
  const cleanId = projectId.trim()
  if (!isValidClarityId(cleanId)) return null
  if (!hasConsent || isAdminPath(pathname)) return null

  const snippet = `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(cleanId)});`

  return (
    <Script id="microsoft-clarity" nonce={nonce} strategy="afterInteractive">
      {snippet}
    </Script>
  )
}
