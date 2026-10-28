"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCspNonce } from "@/app/providers"
import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookies/consent"

interface GoogleAnalyticsProps {
  measurementId: string
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Componente oficial de Google Analytics 4 (GA4) con soporte para nonce CSP y Consent Mode.
 * Solo se carga y rastrea si el usuario otorgó su consentimiento de analítica/cookies.
 * Omite el tracking en rutas administrativas (/admin/*).
 */
export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const nonce = useCspNonce()
  const pathname = usePathname()
  const isInitialPath = useRef(true)
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

  useEffect(() => {
    if (!hasConsent) return
    if (isInitialPath.current) {
      isInitialPath.current = false
      return
    }
    if (isAdminPath(pathname) || !window.gtag) return
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    })
  }, [pathname, hasConsent])

  if (!hasConsent || isAdminPath(pathname) || !measurementId) return null

  const snippet = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(measurementId)}, {
  page_path: window.location.pathname,
  send_page_view: true
});`

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" nonce={nonce} strategy="afterInteractive">
        {snippet}
      </Script>
    </>
  )
}
