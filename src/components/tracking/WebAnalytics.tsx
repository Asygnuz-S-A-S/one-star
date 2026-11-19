"use client"

import { Suspense, useEffect, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Analítica propia: manda cada vista a `/api/track`, en nuestro dominio.
 *
 * Usa `sendBeacon`, que el navegador entrega en segundo plano y sobrevive a que
 * la persona cambie de página: no frena la navegación ni pelea con el render.
 * El tipo de evento lo decide el servidor (ver `lib/analytics/web-events.ts`).
 */

const TRACK_ENDPOINT = "/api/track"

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

function sendHit(path: string, query: string, referrer: string): void {
  const body = JSON.stringify({ path, query, referrer: referrer || null })

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" })
      if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) return
    }
    // Reserva para navegadores sin sendBeacon o cuando la cola está llena.
    void fetch(TRACK_ENDPOINT, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Medir no puede romper la página.
  }
}

function WebAnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastHit = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname || isAdminPath(pathname)) return

    const query = searchParams.toString()
    const key = `${pathname}?${query}`
    // El efecto puede repetirse (StrictMode, re-render): un hit por URL.
    if (lastHit.current === key) return
    lastHit.current = key

    sendHit(pathname, query, typeof document === "undefined" ? "" : document.referrer)
  }, [pathname, searchParams])

  return null
}

export default function WebAnalytics() {
  // `useSearchParams` obliga a un límite de Suspense para no volver dinámica
  // toda la página que monte este componente.
  return (
    <Suspense fallback={null}>
      <WebAnalyticsTracker />
    </Suspense>
  )
}
