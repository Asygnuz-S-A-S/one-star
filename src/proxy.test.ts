import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

const mockResolveActiveAdminRole = vi.hoisted(() => vi.fn())
const mockRevokeAdminSessionByToken = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/admin-role.service", () => ({
  resolveActiveAdminRole: mockResolveActiveAdminRole,
  revokeAdminSessionByToken: mockRevokeAdminSessionByToken,
}))

import { auth } from "@/lib/auth"
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

  it("allows the builder to preview campaign landings", async () => {
    const campaignPreview = await proxy(new NextRequest("https://example.com/campanas/hoka-running?preview=true"))
    const nestedPath = await proxy(new NextRequest("https://example.com/campanas/hoka/extra?preview=true"))

    expect(campaignPreview.headers.get("content-security-policy")).toContain("frame-ancestors 'self'")
    expect(nestedPath.headers.get("content-security-policy")).toContain("frame-ancestors 'none'")
  })
})

describe("proxy control de acceso por rol de admin", () => {
  function withSession(
    adminRoleInSession: string | null | undefined,
    dbRole: string | null = (adminRoleInSession as string | null) ?? null,
    userId = "adm_1",
    email = "admin@onestar.com.co"
  ) {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: "sess_1", token: "tok_123" },
      user: { id: userId, email, userType: "admin", adminRole: adminRoleInSession },
    } as never)
    mockResolveActiveAdminRole.mockResolvedValue(dbRole)
  }

  it("redirige a /admin al operador de inventario que escribe la URL de una página restringida", async () => {
    withSession("INVENTORY_OPERATOR")
    const res = await proxy(new NextRequest("https://example.com/admin/cupones"))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin")
  })

  it("deja pasar al operador de inventario a productos", async () => {
    withSession("INVENTORY_OPERATOR")
    const res = await proxy(new NextRequest("https://example.com/admin/productos/importar"))
    expect(res.headers.get("location")).toBeNull()
  })

  it("deja pasar al super admin a cualquier página", async () => {
    withSession("SUPER_ADMIN")
    const res = await proxy(new NextRequest("https://example.com/admin/cupones"))
    expect(res.headers.get("location")).toBeNull()
  })

  it("redirige a /admin/login, limpia cookies y revoca sesión si el rol en BD es nulo o inválido", async () => {
    // La sesión afirmaba ser SUPER_ADMIN, pero en BD no tiene rol válido
    withSession("SUPER_ADMIN", null)
    const res = await proxy(new NextRequest("https://example.com/admin/pedidos"))

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(
      "https://example.com/admin/login?callbackUrl=%2Fadmin%2Fpedidos"
    )

    // Se eliminan las cookies de sesión
    const setCookie = res.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain("better-auth.session_token")
    expect(setCookie).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i)

    // Se revoca el token en base de datos
    expect(mockRevokeAdminSessionByToken).toHaveBeenCalledWith("tok_123")
  })

  it("resuelve el rol desde la base de datos para sesiones antiguas sin adminRole", async () => {
    withSession(undefined, "SUPER_ADMIN")
    const res = await proxy(new NextRequest("https://example.com/admin/cupones"))
    expect(res.headers.get("location")).toBeNull()
    expect(mockResolveActiveAdminRole).toHaveBeenCalledWith("adm_1", "admin@onestar.com.co")
  })

  it("refleja de inmediato una degradación en BD redirigiendo fuera de rutas restringidas", async () => {
    // La sesión aún contiene SUPER_ADMIN, pero la base de datos devuelve INVENTORY_OPERATOR
    withSession("SUPER_ADMIN", "INVENTORY_OPERATOR")
    const res = await proxy(new NextRequest("https://example.com/admin/cupones"))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin")
  })
})
