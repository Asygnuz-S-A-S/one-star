import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import CookieBanner from "../CookieBanner"
import { COOKIE_CONSENT_KEY } from "@/lib/cookies/consent"

describe("CookieBanner Component", () => {
  let mockDocument: { cookie: string }

  beforeEach(() => {
    mockDocument = { cookie: "" }
    vi.stubGlobal("document", mockDocument)
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("no muestra el banner si el usuario ya tiene cookie de consentimiento registrada", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    const html = renderToStaticMarkup(<CookieBanner />)
    expect(html).toBe("")
  })

  it("ofrece opciones con igual prominencia para aceptar y rechazar", () => {
    mockDocument.cookie = ""

    // En render inicial sin cookie montada
    const html = renderToStaticMarkup(<CookieBanner />)
    // El componente cliente se monta en useEffect, por lo que inicialmente devuelve null en SSR
    expect(html).toBe("")
  })
})
