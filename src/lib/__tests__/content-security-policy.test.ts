import { describe, expect, it } from "vitest"

import { buildContentSecurityPolicy } from "@/lib/content-security-policy"

describe("buildContentSecurityPolicy", () => {
  it("builds a strict production script policy around the request nonce", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "request-nonce",
      isDevelopment: false,
      allowSameOriginFraming: false,
    })

    const scriptDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src "))

    expect(scriptDirective).toBe(
      "script-src 'self' 'nonce-request-nonce' 'strict-dynamic' https://*.epayco.co https://connect.facebook.net",
    )
    expect(scriptDirective).not.toContain("'unsafe-inline'")
    expect(scriptDirective).not.toContain("'unsafe-eval'")
  })

  it("adds development-only exceptions for source maps and hot reload", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "dev-nonce",
      isDevelopment: true,
      allowSameOriginFraming: false,
    })

    expect(policy).toContain("'unsafe-eval'")
    expect(policy).toContain("ws:")
    expect(policy).toContain("wss:")
  })

  it("keeps an ePayco host fallback for browsers without strict-dynamic", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "fallback-nonce",
      isDevelopment: false,
      allowSameOriginFraming: false,
    })
    const scriptDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src "))

    expect(scriptDirective).toContain("https://*.epayco.co")
    expect(scriptDirective).toContain("https://connect.facebook.net")
  })

  it("allows same-origin framing only for the preview response", () => {
    const regularPolicy = buildContentSecurityPolicy({
      nonce: "regular-nonce",
      isDevelopment: false,
      allowSameOriginFraming: false,
    })
    const previewPolicy = buildContentSecurityPolicy({
      nonce: "preview-nonce",
      isDevelopment: false,
      allowSameOriginFraming: true,
    })

    expect(regularPolicy).toContain("frame-ancestors 'none'")
    expect(previewPolicy).toContain("frame-ancestors 'self'")
    expect(previewPolicy).not.toContain("frame-ancestors 'none'")
  })

  it("allows each current integration only through its required resource type", () => {
    const policy = buildContentSecurityPolicy({
      nonce: "integration-nonce",
      isDevelopment: false,
      allowSameOriginFraming: false,
    })

    expect(policy).toContain(
      "connect-src 'self' https://*.epayco.co https://*.epayco.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://nominatim.openstreetmap.org https://connect.facebook.net https://www.facebook.com",
    )
    expect(policy).toContain("frame-src 'self' https://*.epayco.co")
    expect(policy).toContain("form-action 'self' https://*.epayco.co")
    expect(policy).toContain("img-src 'self' blob: data: https:")
    expect(policy).toContain("media-src 'self' blob: https:")
    expect(policy).not.toContain("default-src *")
    expect(policy).not.toContain("script-src *")
  })

  it("rejects a nonce that could inject another directive", () => {
    expect(() =>
      buildContentSecurityPolicy({
        nonce: "valid; script-src *",
        isDevelopment: false,
        allowSameOriginFraming: false,
      }),
    ).toThrow("Invalid CSP nonce")

    expect(() =>
      buildContentSecurityPolicy({
        nonce: "a=b",
        isDevelopment: false,
        allowSameOriginFraming: false,
      }),
    ).toThrow("Invalid CSP nonce")
  })
})
