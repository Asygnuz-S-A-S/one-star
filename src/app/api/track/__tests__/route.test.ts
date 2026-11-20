import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  }
  return {
    cookieStore,
    cookies: vi.fn(async () => cookieStore),
    consumePublicRateLimit: vi.fn(),
    trackWebHit: vi.fn(),
  }
})

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}))

vi.mock("@/server/services/public-rate-limit.service", () => ({
  consumePublicRateLimit: mocks.consumePublicRateLimit,
}))

vi.mock("@/server/services/web-analytics.service", () => ({
  SESSION_COOKIE: "os_sid",
  VISITOR_COOKIE: "os_vid",
  trackWebHit: mocks.trackWebHit,
}))

import { POST } from "../route"

describe("POST /api/track", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookieStore.get.mockReturnValue(undefined)
    mocks.consumePublicRateLimit.mockResolvedValue({ allowed: true })
    mocks.trackWebHit.mockResolvedValue({
      eventId: "evt-123",
      classified: { type: "PAGE_VIEW" },
      cookiesToSet: [],
    })
  })

  it("responde 400 si el cuerpo no es JSON válido", async () => {
    const req = new Request("http://localhost/api/track", {
      method: "POST",
      body: "not-json",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mocks.consumePublicRateLimit).not.toHaveBeenCalled()
  })

  it("responde 400 si el esquema del cuerpo es inválido (ej. sin ruta)", async () => {
    const req = new Request("http://localhost/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "algo" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mocks.consumePublicRateLimit).not.toHaveBeenCalled()
  })

  it("evalúa el límite de tasa usando la IP a través de consumePublicRateLimit", async () => {
    const headers = new Headers({
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.42",
    })
    const req = new Request("http://localhost/api/track", {
      method: "POST",
      headers,
      body: JSON.stringify({ path: "/productos" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(204)
    expect(mocks.consumePublicRateLimit).toHaveBeenCalledWith(
      "web-analytics",
      expect.any(Headers),
      { max: 120, windowMs: 60_000 },
    )
  })

  it("responde 429 si se excede el límite de tasa por IP", async () => {
    mocks.consumePublicRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 })

    const req = new Request("http://localhost/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/productos" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(mocks.trackWebHit).not.toHaveBeenCalled()
  })

  it("siembra cookies si trackWebHit devuelve cookiesToSet", async () => {
    mocks.trackWebHit.mockResolvedValue({
      eventId: "evt-123",
      classified: { type: "PAGE_VIEW" },
      cookiesToSet: [
        { name: "os_vid", value: "uuid-123", maxAge: 31536000 },
        { name: "os_sid", value: "uuid-456" },
      ],
    })

    const req = new Request("http://localhost/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/hombre" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(204)
    expect(mocks.cookieStore.set).toHaveBeenCalledTimes(2)
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "os_vid",
      "uuid-123",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 31536000 }),
    )
    expect(mocks.cookieStore.set).toHaveBeenCalledWith(
      "os_sid",
      "uuid-456",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    )
  })

  it("responde 204 incluso si trackWebHit falla, para no romper la navegación", async () => {
    mocks.trackWebHit.mockRejectedValue(new Error("Database connection dropped"))

    const req = new Request("http://localhost/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "/productos" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(204)
  })
})
