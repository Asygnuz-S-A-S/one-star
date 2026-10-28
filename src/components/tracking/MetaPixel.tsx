"use client"

import Script from "next/script"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useCspNonce } from "@/app/providers"
import { trackMetaEvent } from "@/lib/tracking/meta-pixel"
import { COOKIE_CONSENT_EVENT, getCookieConsent } from "@/lib/cookies/consent"

const META_PIXEL_SRC = "https://connect.facebook.net/en_US/fbevents.js"

interface MetaPixelProps {
  pixelId: string
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

/**
 * Inyecta el snippet oficial del píxel con el nonce del CSP solo si el usuario
 * ha otorgado consentimiento de cookies (Consent Mode).
 * Dispara el primer PageView al montar y las navegaciones client-side posteriores.
 */
export default function MetaPixel({ pixelId }: MetaPixelProps) {
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
    if (isAdminPath(pathname)) return
    trackMetaEvent("PageView")
  }, [pathname, hasConsent])

  if (!hasConsent || isAdminPath(pathname)) return null

  const snippet = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',${JSON.stringify(META_PIXEL_SRC)});
fbq('init',${JSON.stringify(pixelId)});
fbq('track','PageView');`

  return (
    <Script id="meta-pixel" nonce={nonce} strategy="afterInteractive">
      {snippet}
    </Script>
  )
}
