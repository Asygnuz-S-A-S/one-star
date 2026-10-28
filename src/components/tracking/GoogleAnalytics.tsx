"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useCspNonce } from "@/app/providers"

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
 * Componente oficial de Google Analytics 4 (GA4) con soporte para nonce CSP.
 * Dispara PageView en la carga inicial y en cada navegación de cliente (Next.js App Router).
 * Omite el tracking en rutas administrativas (/admin/*).
 */
export default function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const nonce = useCspNonce()
  const pathname = usePathname()
  const isInitialPath = useRef(true)

  useEffect(() => {
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
  }, [pathname])

  if (isAdminPath(pathname) || !measurementId) return null

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
