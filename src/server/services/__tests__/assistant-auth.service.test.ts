import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

vi.mock("server-only", () => ({}))

import {
  authenticateAssistantRequest,
  checkLeadPhoneRateLimit,
  checkOrderRateLimits,
  recordOrderFailedAttempt,
} from "../assistant-auth.service"
import { prisma } from "../../db/prisma"
import * as publicRateLimitService from "../public-rate-limit.service"
import * as requestRateLimitRepo from "../../repositories/request-rate-limit.repository"

describe("assistant-auth.service", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("responde 405 Method Not Allowed si el método no es GET en rutas de consulta", async () => {
    process.env.ASSISTANT_API_KEY = "test-secret-key"

    const req = new Request("https://onestar.com.co/api/assistant/products", {
      method: "POST",
      headers: { "x-assistant-key": "test-secret-key" },
    })

    const result = await authenticateAssistantRequest(req)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(405)
      expect(result.response.headers.get("Allow")).toBe("GET")
      const data = await result.response.json()
      expect(data.error).toMatch(/no permitido/i)
    }
  })

  it("permite POST únicamente en /api/assistant/leads, /api/assistant/leads/event y /api/assistant/leads/link", async () => {
    process.env.ASSISTANT_API_KEY = "test-secret-key"
    vi.spyOn(publicRateLimitService, "consumePublicRateLimit").mockResolvedValue({
      allowed: true,
    })

    for (const path of [
      "/api/assistant/leads",
      "/api/assistant/leads/event",
      "/api/assistant/leads/link",
    ]) {
      const postReq = new Request(`https://onestar.com.co${path}`, {
        method: "POST",
        headers: { "x-assistant-key": "test-secret-key" },
      })
      const postRes = await authenticateAssistantRequest(postReq)
      expect(postRes.authorized).toBe(true)

      const getReq = new Request(`https://onestar.com.co${path}`, {
        method: "GET",
        headers: { "x-assistant-key": "test-secret-key" },
      })
      const getRes = await authenticateAssistantRequest(getReq)
      expect(getRes.authorized).toBe(false)
      if (!getRes.authorized) {
        expect(getRes.response.status).toBe(405)
        expect(getRes.response.headers.get("Allow")).toBe("POST")
      }
    }
  })

  it("responde 503 si ASSISTANT_API_KEY no está configurada en variables de entorno", async () => {
    delete process.env.ASSISTANT_API_KEY

    const req = new Request("https://onestar.com.co/api/assistant/products", {
      method: "GET",
      headers: { "x-assistant-key": "some-key" },
    })

    const result = await authenticateAssistantRequest(req)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(503)
      const data = await result.response.json()
      expect(data.error).toMatch(/deshabilitado|no configurado/i)
    }
  })

  it("responde 401 si falta la cabecera x-assistant-key", async () => {
    process.env.ASSISTANT_API_KEY = "correct-key-123"

    const req = new Request("https://onestar.com.co/api/assistant/products", {
      method: "GET",
    })

    const result = await authenticateAssistantRequest(req)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(401)
      const data = await result.response.json()
      expect(data.error).toMatch(/no autorizado/i)
    }
  })

  it("responde 401 si la clave provista es incorrecta", async () => {
    process.env.ASSISTANT_API_KEY = "correct-key-123"

    const req = new Request("https://onestar.com.co/api/assistant/products", {
      method: "GET",
      headers: { "x-assistant-key": "wrong-key-456" },
    })

    const result = await authenticateAssistantRequest(req)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(401)
      const data = await result.response.json()
      expect(data.error).toMatch(/no autorizado/i)
    }
  })

  it("autoriza la petición con código 200/authorized=true cuando la clave coincide", async () => {
    process.env.ASSISTANT_API_KEY = "correct-key-123"

    vi.spyOn(publicRateLimitService, "consumePublicRateLimit").mockResolvedValueOnce({
      allowed: true,
    })

    const req = new Request("https://onestar.com.co/api/assistant/products", {
      method: "GET",
      headers: { "x-assistant-key": "correct-key-123" },
    })

    const result = await authenticateAssistantRequest(req)
    expect(result.authorized).toBe(true)
    if (result.authorized) {
      expect(result.apiKey).toBe("correct-key-123")
    }
  })

  it("responde 429 si el rate limit general de la API es superado", async () => {
    process.env.ASSISTANT_API_KEY = "correct-key-123"

    vi.spyOn(publicRateLimitService, "consumePublicRateLimit").mockResolvedValueOnce({
      allowed: false,
      retryAfterSeconds: 45,
    })

    const req = new Request("https://onestar.com.co/api/assistant/products", {
      method: "GET",
      headers: { "x-assistant-key": "correct-key-123" },
    })

    const result = await authenticateAssistantRequest(req)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(429)
      expect(result.response.headers.get("Retry-After")).toBe("45")
      const data = await result.response.json()
      expect(data.error).toMatch(/límite/i)
    }
  })

  it("checkLeadPhoneRateLimit aplica rate limit normalizando waPhone a dígitos", async () => {
    const spy = vi
      .spyOn(publicRateLimitService, "consumePublicRateLimit")
      .mockResolvedValueOnce({ allowed: true })

    const headers = new Headers({ "x-real-ip": "190.25.1.1" })
    const res = await checkLeadPhoneRateLimit(headers, "+57 (300) 123-4567")

    expect(res.allowed).toBe(true)
    expect(spy).toHaveBeenCalledWith(
      "assistant-lead-phone",
      headers,
      expect.objectContaining({
        subject: "573001234567",
      })
    )
  })

  describe("order rate limiting (5 intentos fallidos por hora)", () => {
    it("permite la consulta cuando no se ha superado el límite", async () => {
      vi.spyOn(requestRateLimitRepo, "findActiveRateLimitExceeded").mockResolvedValueOnce([])

      const headers = new Headers({ "x-real-ip": "190.25.1.1" })
      const status = await checkOrderRateLimits(headers, "12345678", "573001234567")

      expect(status.blocked).toBe(false)
    })

    it("bloquea con 429 si alguna clave (ip, cédula o waPhone) alcanzó 5 fallos", async () => {
      const resetTime = new Date(Date.now() + 1800 * 1000)
      vi.spyOn(requestRateLimitRepo, "findActiveRateLimitExceeded").mockResolvedValueOnce([
        {
          count: 5,
          resetAt: resetTime,
        },
      ])

      const headers = new Headers({ "x-real-ip": "190.25.1.1" })
      const status = await checkOrderRateLimits(headers, "12345678", "573001234567")

      expect(status.blocked).toBe(true)
      expect(status.retryAfterSeconds).toBeGreaterThan(0)
    })

    it("recordOrderFailedAttempt incrementa los contadores para IP, cédula y waPhone", async () => {
      const queryRawSpy = vi.spyOn(prisma, "$queryRaw").mockResolvedValue([
        { count: 1, resetAt: new Date() },
      ])

      const headers = new Headers({ "x-real-ip": "190.25.1.1" })
      await recordOrderFailedAttempt(headers, "1020304050", "+57 300 123 4567")

      // Se registran 3 claves: IP, cédula y waPhone normalizado
      expect(queryRawSpy).toHaveBeenCalledTimes(3)
    })
  })
})
