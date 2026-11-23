"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useCspNonce } from "@/app/providers"
import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookies/consent"

interface GoogleTagManagerProps {
  gtmId?: string | null
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function isValidGtmId(id: string): boolean {
  return /^GTM-[A-Z0-9]+$/i.test(id.trim())
}

/**
 * Componente oficial de Google Tag Manager (GTM).
 *
 * Características:
 * - Se inyecta solo si `gtmId` está configurado y el formato es válido (`GTM-XXXXXXX`).
 * - Respeta estrictamente Consent Mode: solo se ejecuta si el usuario otorgó consentimiento.
 * - Soporta nonce CSP y se ejecuta con estrategia `afterInteractive`.
 * - Omite tracking en rutas administrativas (/admin/*).
 * - Si `gtmId` no está definido, retorna null sin impacto en la página.
 */
export default function GoogleTagManager({ gtmId }: GoogleTagManagerProps) {
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

  if (!gtmId) return null
  const cleanId = gtmId.trim()
  if (!isValidGtmId(cleanId)) return null
  if (!hasConsent || isAdminPath(pathname)) return null

  const snippet = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(cleanId)});`

  return (
    <>
      <Script id="google-tag-manager" nonce={nonce} strategy="afterInteractive">
        {snippet}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(cleanId)}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  )
}
