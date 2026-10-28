import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  COOKIE_BANNER_OPEN_EVENT,
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_KEY,
  getCookieConsent,
  openCookieBanner,
  setCookieConsent,
} from "../consent"

class MockWindow {
  listeners: Record<string, ((event: unknown) => void)[]> = {}
  addEventListener(event: string, fn: (event: unknown) => void) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(fn)
  }
  removeEventListener(event: string, fn: (event: unknown) => void) {
    this.listeners[event] = (this.listeners[event] || []).filter((l) => l !== fn)
  }
  dispatchEvent(event: { type: string; detail?: unknown }) {
    const list = this.listeners[event.type] || []
    for (const fn of list) fn(event)
    return true
  }
}

describe("Cookie Consent Utilities", () => {
  let mockWindow: MockWindow
  let mockDocument: { cookie: string }

  beforeEach(() => {
    mockWindow = new MockWindow()
    mockDocument = { cookie: "" }

    vi.stubGlobal("window", mockWindow)
    vi.stubGlobal("document", mockDocument)
    vi.stubGlobal("CustomEvent", class CustomEvent {
      type: string
      detail: unknown
      constructor(type: string, options?: { detail?: unknown }) {
        this.type = type
        this.detail = options?.detail
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("retorna null cuando no hay cookie de consentimiento", () => {
    mockDocument.cookie = ""
    expect(getCookieConsent()).toBeNull()
  })

  it("establece y lee el consentimiento aceptado", () => {
    const listener = vi.fn()
    window.addEventListener(COOKIE_CONSENT_EVENT, listener)

    setCookieConsent("accepted")

    expect(getCookieConsent()).toBe("accepted")
    expect(mockDocument.cookie).toContain(`${COOKIE_CONSENT_KEY}=accepted`)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { consent: "accepted" },
      })
    )

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })

  it("establece y lee el consentimiento rechazado", () => {
    const listener = vi.fn()
    window.addEventListener(COOKIE_CONSENT_EVENT, listener)

    setCookieConsent("rejected")

    expect(getCookieConsent()).toBe("rejected")
    expect(mockDocument.cookie).toContain(`${COOKIE_CONSENT_KEY}=rejected`)
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { consent: "rejected" },
      })
    )

    window.removeEventListener(COOKIE_CONSENT_EVENT, listener)
  })

  it("emite el evento de apertura del banner de cookies", () => {
    const listener = vi.fn()
    window.addEventListener(COOKIE_BANNER_OPEN_EVENT, listener)

    openCookieBanner()

    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(COOKIE_BANNER_OPEN_EVENT, listener)
  })
})
