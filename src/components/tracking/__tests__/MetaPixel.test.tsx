import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("next/navigation", () => ({
  usePathname: () => "/productos/nike-air-force-1",
}))

vi.mock("@/app/providers", () => ({
  useCspNonce: () => "test-nonce-123",
}))

vi.mock("@/lib/tracking/meta-pixel", () => ({
  trackMetaEvent: vi.fn(),
}))

vi.mock("next/script", () => ({
  default: ({ id, children, src, ...props }: { id?: string; children?: React.ReactNode; src?: string }) => {
    return <script id={id} data-src={src} {...props}>{children}</script>
  },
}))

import MetaPixel from "../MetaPixel"
import GoogleAnalytics from "../GoogleAnalytics"
import { COOKIE_CONSENT_KEY } from "@/lib/cookies/consent"

describe("Tracking Components Consent Mode", () => {
  let mockDocument: { cookie: string }

  beforeEach(() => {
    mockDocument = { cookie: "" }
    vi.stubGlobal("document", mockDocument)
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dataLayer: [],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("NO carga Meta Pixel si el usuario no ha otorgado consentimiento", () => {
    mockDocument.cookie = "" // sin cookie

    const html = renderToStaticMarkup(<MetaPixel pixelId="1234567890" />)
    expect(html).toBe("")
  })

  it("NO carga Meta Pixel si el usuario ha rechazado las cookies opcionales", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=rejected`

    const html = renderToStaticMarkup(<MetaPixel pixelId="1234567890" />)
    expect(html).toBe("")
  })

  it("carga el snippet de Meta Pixel cuando el usuario ha aceptado las cookies", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    const html = renderToStaticMarkup(<MetaPixel pixelId="1234567890" />)
    expect(html).toContain('id="meta-pixel"')
    expect(html).toContain("1234567890")
    expect(html).toContain("fbq('track','PageView')")
  })

  it("NO carga Google Analytics si el usuario no ha otorgado consentimiento", () => {
    mockDocument.cookie = ""

    const html = renderToStaticMarkup(<GoogleAnalytics measurementId="G-XXXXXX" />)
    expect(html).toBe("")
  })

  it("NO carga Google Analytics si el usuario ha rechazado las cookies opcionales", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=rejected`

    const html = renderToStaticMarkup(<GoogleAnalytics measurementId="G-XXXXXX" />)
    expect(html).toBe("")
  })

  it("carga el script de Google Analytics cuando el usuario ha aceptado las cookies", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    const html = renderToStaticMarkup(<GoogleAnalytics measurementId="G-XXXXXX" />)
    expect(html).toContain('id="google-analytics"')
    expect(html).toContain("G-XXXXXX")
  })
})
