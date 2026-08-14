import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

import { config, proxy } from "@/proxy"

function getResponseNonce(response: Response): string | null {
  const policy = response.headers.get("content-security-policy")
  return policy?.match(/'nonce-([^']+)'/)?.[1] ?? null
}

describe("proxy CSP", () => {
  it("matches every route that can return HTML", () => {
    const routeMatcher = new RegExp(`^${config.matcher[0]}$`)

    expect(
      [
        "/api/nope",
        "/apiary",
        "/favicon.ico",
        "/robots.txt",
        "/robots.txt-old",
        "/sitemap.xml",
      ].every((pathname) => routeMatcher.test(pathname)),
    ).toBe(true)
    expect(routeMatcher.test("/_next/static/chunks/app.js")).toBe(false)
    expect(routeMatcher.test("/_next/image")).toBe(false)
  })

  it("forwards a fresh nonce and returns it in the CSP for every request", async () => {
    const firstResponse = await proxy(new NextRequest("https://example.com/"))
    const secondResponse = await proxy(new NextRequest("https://example.com/"))

    const firstNonce = getResponseNonce(firstResponse)
    const secondNonce = getResponseNonce(secondResponse)

    expect(firstNonce).toBeTruthy()
    expect(secondNonce).toBeTruthy()
    expect(firstNonce).not.toBe(secondNonce)
    expect(firstResponse.headers.get("x-middleware-request-x-nonce")).toBe(
      firstNonce,
    )
    expect(secondResponse.headers.get("x-middleware-request-x-nonce")).toBe(
      secondNonce,
    )
    expect(
      firstResponse.headers.get(
        "x-middleware-request-content-security-policy",
      ),
    ).toBe(firstResponse.headers.get("content-security-policy"))
    expect(
      secondResponse.headers.get(
        "x-middleware-request-content-security-policy",
      ),
    ).toBe(secondResponse.headers.get("content-security-policy"))
  })

  it("keeps the CSP on authentication redirects", async () => {
    const response = await proxy(
      new NextRequest("https://example.com/admin/pedidos"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin/login?callbackUrl=%2Fadmin%2Fpedidos",
    )
    expect(getResponseNonce(response)).toBeTruthy()
  })

  it("does not protect routes that merely share an auth route prefix", async () => {
    const adminLikeResponse = await proxy(
      new NextRequest("https://example.com/administrator"),
    )
    const accountLikeResponse = await proxy(
      new NextRequest("https://example.com/cuenta-regresiva"),
    )

    expect(adminLikeResponse.status).toBe(200)
    expect(accountLikeResponse.status).toBe(200)
  })

  it("allows same-origin framing only for the exact preview URL", async () => {
    const previewResponse = await proxy(
      new NextRequest("https://example.com/?preview=true"),
    )
    const regularResponse = await proxy(
      new NextRequest("https://example.com/productos?preview=true"),
    )

    expect(previewResponse.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'self'",
    )
    expect(regularResponse.headers.get("content-security-policy")).toContain(
      "frame-ancestors 'none'",
    )
  })
})
