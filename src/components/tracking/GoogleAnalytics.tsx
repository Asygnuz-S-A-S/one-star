"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCspNonce } from "@/app/providers"
import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookies/consent"

interface GoogleAnalyticsProps {
  measurementId?: string | null
  googleAdsId?: string | null
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function isValidGaId(id: string): boolean {
  return /^G-[A-Z0-9]+$/i.test(id.trim())
}

function isValidAdsId(id: string): boolean {
  return /^AW-[0-9]+$/i.test(id.trim())
}

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Componente oficial de Google Analytics 4 (GA4) y Google Ads con soporte para nonce CSP y Consent Mode.
 * Solo se carga y rastrea si el usuario otorgó su consentimiento de analítica/cookies.
 * Omite el tracking en rutas administrativas (/admin/*).
 * Si no se define measurementId ni googleAdsId, retorna null.
 */
export default function GoogleAnalytics({ measurementId, googleAdsId }: GoogleAnalyticsProps) {
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

  const cleanMeasurementId = measurementId?.trim() && isValidGaId(measurementId.trim()) ? measurementId.trim() : null
  const cleanAdsId = googleAdsId?.trim() && isValidAdsId(googleAdsId.trim()) ? googleAdsId.trim() : null
  const primaryId = cleanMeasurementId || cleanAdsId

  useEffect(() => {
    if (!hasConsent) return
    if (isInitialPath.current) {
      isInitialPath.current = false
      return
    }
    if (isAdminPath(pathname) || !window.gtag) return

    if (cleanMeasurementId) {
      window.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    if (cleanAdsId) {
      window.gtag("event", "page_view", {
        send_to: cleanAdsId,
        page_path: pathname,
      })
    }
  }, [pathname, hasConsent, cleanMeasurementId, cleanAdsId])

  if (!hasConsent || isAdminPath(pathname) || !primaryId) return null

  const configSnippet = [
    cleanMeasurementId ? `gtag('config', ${JSON.stringify(cleanMeasurementId)}, { page_path: window.location.pathname, send_page_view: true });` : "",
    cleanAdsId ? `gtag('config', ${JSON.stringify(cleanAdsId)});` : "",
  ].filter(Boolean).join("\n")

  const snippet = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${configSnippet}`

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(primaryId)}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-analytics" nonce={nonce} strategy="afterInteractive">
        {snippet}
      </Script>
    </>
  )
}
