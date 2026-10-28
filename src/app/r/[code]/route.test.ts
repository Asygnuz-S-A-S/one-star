import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  consumePublicRateLimit: vi.fn(),
  resolveShortLinkClick: vi.fn(),
}))

vi.mock("@/server/services/public-rate-limit.service", () => ({
  consumePublicRateLimit: mocks.consumePublicRateLimit,
}))

vi.mock("@/server/services/lead.service", () => ({
  resolveShortLinkClick: mocks.resolveShortLinkClick,
}))

import { GET } from "./route"
import { LEAD_COOKIE_NAME, verifyLeadCookieValue } from "@/lib/lead-cookie"

describe("GET /r/[code]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("AUTH_SECRET", "test-secret-for-os-lead-cookie")
    mocks.consumePublicRateLimit.mockResolvedValue({ allowed: true })
  })

  it("redirige 302 al producto con UTM y fija cookie firmada os_lead cuando el código es válido", async () => {
    mocks.resolveShortLinkClick.mockResolvedValueOnce({
      found: true,
      leadId: "lead_xyz",
      redirectUrl:
        "https://onestar.com.co/productos/vans-knu-skool?utm_source=whatsapp&utm_medium=asistente&utm_campaign=bot&utm_content=abc12345",
    })

    const req = new Request("https://onestar.com.co/r/abc12345")
    const res = await GET(req, { params: Promise.resolve({ code: "abc12345" }) })

    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toBe(
      "https://onestar.com.co/productos/vans-knu-skool?utm_source=whatsapp&utm_medium=asistente&utm_campaign=bot&utm_content=abc12345"
    )

    const setCookieHeader = res.headers.get("set-cookie") ?? ""
    expect(setCookieHeader).toContain(`${LEAD_COOKIE_NAME}=`)
    expect(setCookieHeader).toContain("HttpOnly")
    expect(setCookieHeader).toMatch(/SameSite=Lax/i)

    const cookieMatch = setCookieHeader.match(/os_lead=([^;]+)/)
    expect(cookieMatch).not.toBeNull()
    const verifiedLeadId = verifyLeadCookieValue(decodeURIComponent(cookieMatch![1]))
    expect(verifiedLeadId).toBe("lead_xyz")
  })

  it("redirige 302 al producto sin error y sin fijar cookie cuando el código es desconocido", async () => {
    mocks.resolveShortLinkClick.mockResolvedValueOnce({
      found: false,
      leadId: null,
      redirectUrl:
        "https://onestar.com.co/productos/vans-old-skool?utm_source=whatsapp&utm_medium=asistente&utm_content=invalido",
    })

    const req = new Request("https://onestar.com.co/r/invalido?p=vans-old-skool")
    const res = await GET(req, { params: Promise.resolve({ code: "invalido" }) })

    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toContain("/productos/vans-old-skool")
    expect(res.headers.get("set-cookie")).toBeNull()
  })

  it("responde 429 si se excede el límite de peticiones por IP", async () => {
    mocks.consumePublicRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 30,
    })

    const req = new Request("https://onestar.com.co/r/abc12345")
    const res = await GET(req, { params: Promise.resolve({ code: "abc12345" }) })

    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("30")
  })
})
