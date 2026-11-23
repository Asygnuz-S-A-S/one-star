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
import GoogleTagManager from "../GoogleTagManager"
import MicrosoftClarity from "../MicrosoftClarity"
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

  it("carga Google Ads junto con GA4 cuando ambos están configurados y con consentimiento", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    const html = renderToStaticMarkup(
      <GoogleAnalytics measurementId="G-XXXXXX" googleAdsId="AW-123456789" />,
    )
    expect(html).toContain('id="google-analytics"')
    expect(html).toContain("G-XXXXXX")
    expect(html).toContain("AW-123456789")
  })

  it("NO carga Google Tag Manager si no hay consentimiento", () => {
    mockDocument.cookie = ""

    const html = renderToStaticMarkup(<GoogleTagManager gtmId="GTM-TEST123" />)
    expect(html).toBe("")
  })

  it("NO carga Google Tag Manager si el ID es inválido o no existe", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    expect(renderToStaticMarkup(<GoogleTagManager gtmId={null} />)).toBe("")
    expect(renderToStaticMarkup(<GoogleTagManager gtmId="" />)).toBe("")
    expect(renderToStaticMarkup(<GoogleTagManager gtmId="INVALID-ID" />)).toBe("")
  })

  it("carga Google Tag Manager cuando hay consentimiento y un ID válido", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    const html = renderToStaticMarkup(<GoogleTagManager gtmId="GTM-ABCD123" />)
    expect(html).toContain('id="google-tag-manager"')
    expect(html).toContain("GTM-ABCD123")
    expect(html).toContain("https://www.googletagmanager.com/ns.html?id=GTM-ABCD123")
  })

  it("NO carga Microsoft Clarity si no hay consentimiento", () => {
    mockDocument.cookie = ""

    const html = renderToStaticMarkup(<MicrosoftClarity projectId="clarity123" />)
    expect(html).toBe("")
  })

  it("NO carga Microsoft Clarity si el ID no existe o está vacío", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    expect(renderToStaticMarkup(<MicrosoftClarity projectId={null} />)).toBe("")
    expect(renderToStaticMarkup(<MicrosoftClarity projectId="" />)).toBe("")
  })

  it("carga Microsoft Clarity cuando hay consentimiento y projectId", () => {
    mockDocument.cookie = `${COOKIE_CONSENT_KEY}=accepted`

    const html = renderToStaticMarkup(<MicrosoftClarity projectId="clarityproj123" />)
    expect(html).toContain('id="microsoft-clarity"')
    expect(html).toContain("clarityproj123")
  })
})
