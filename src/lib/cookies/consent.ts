import { useSyncExternalStore } from "react"

export const COOKIE_CONSENT_KEY = "onestar_cookie_consent"
export const COOKIE_CONSENT_EVENT = "onestar_cookie_consent_changed"
export const COOKIE_BANNER_OPEN_EVENT = "onestar_open_cookie_banner"

export type CookieConsentStatus = "accepted" | "rejected"

export function getCookieConsent(): CookieConsentStatus | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_CONSENT_KEY}=([^;]+)`))
  if (!match) return null
  const value = match[1]
  return value === "accepted" ? "accepted" : value === "rejected" ? "rejected" : null
}

export function setCookieConsent(status: CookieConsentStatus): void {
  if (typeof document === "undefined") return
  const oneYearInSeconds = 365 * 24 * 60 * 60
  document.cookie = `${COOKIE_CONSENT_KEY}=${status}; path=/; max-age=${oneYearInSeconds}; SameSite=Lax`
  window.dispatchEvent(
    new CustomEvent(COOKIE_CONSENT_EVENT, {
      detail: { consent: status },
    })
  )
}

export function openCookieBanner(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(COOKIE_BANNER_OPEN_EVENT))
}

function subscribeToConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(COOKIE_CONSENT_EVENT, callback)
  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, callback)
  }
}

export function useCookieConsent(): CookieConsentStatus | null {
  return useSyncExternalStore(
    subscribeToConsent,
    getCookieConsent,
    () => null
  )
}
