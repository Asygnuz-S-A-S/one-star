import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

import { GET as getProducts } from "../products/route"
import { GET as getStock } from "../stock/route"
import { GET as getOrder } from "../order/route"
import { POST as postLead } from "../leads/route"
import { POST as postLeadEvent } from "../leads/event/route"
import { POST as postLeadLink } from "../leads/link/route"
import * as assistantAuthService from "@/server/services/assistant-auth.service"
import * as assistantService from "@/server/services/assistant.service"
import * as leadService from "@/server/services/lead.service"

describe("Assistant API Routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("GET /api/assistant/products", () => {
    it("valida parámetros y retorna 400 si los datos son inválidos", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      const req = new Request("https://onestar.com.co/api/assistant/products?gender=invalido")
      const res = await getProducts(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe("Parámetros inválidos")
    })

    it("retorna productos con éxito cuando los parámetros son válidos", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      vi.spyOn(assistantService, "searchAssistantProducts").mockResolvedValueOnce({
        total: 1,
        products: [
          {
            name: "Vans Asher",
            brand: "Vans",
            category: "Lifestyle",
            gender: "unisex",
            color: "Verde",
            price: 249900,
            salePrice: null,
            currency: "COP",
            sizesAvailable: ["7"],
            inStock: true,
            url: "https://onestar.com.co/productos/vans-asher",
            imageUrl: "https://img.test/1.jpg",
          },
        ],
      })

      const req = new Request("https://onestar.com.co/api/assistant/products?q=vans&limit=3")
      const res = await getProducts(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.total).toBe(1)
      expect(data.products).toHaveLength(1)
    })
  })

  describe("GET /api/assistant/stock", () => {
    it("retorna 400 si falta el parámetro product o size", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      const req = new Request("https://onestar.com.co/api/assistant/stock?product=vans")
      const res = await getStock(req)

      expect(res.status).toBe(400)
    })

    it("retorna 404 si el producto no se encuentra", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      vi.spyOn(assistantService, "checkAssistantStock").mockResolvedValueOnce(null)

      const req = new Request("https://onestar.com.co/api/assistant/stock?product=inexistente&size=8")
      const res = await getStock(req)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toMatch(/no encontrado/i)
    })

    it("retorna disponibilidad cuando se encuentra el producto", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      vi.spyOn(assistantService, "checkAssistantStock").mockResolvedValueOnce({
        product: "Vans Knu Skool",
        size: "8",
        available: true,
        lowStock: false,
        price: 429000,
        currency: "COP",
        url: "https://onestar.com.co/productos/vans-knu-skool",
      })

      const req = new Request("https://onestar.com.co/api/assistant/stock?product=vans-knu-skool&size=8")
      const res = await getStock(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.available).toBe(true)
      expect(data.lowStock).toBe(false)
    })
  })

  describe("GET /api/assistant/order", () => {
    it("retorna 400 si faltan cédula o waPhone", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      const req = new Request("https://onestar.com.co/api/assistant/order?cedula=123")
      const res = await getOrder(req)

      expect(res.status).toBe(400)
    })

    it("retorna 429 si se superó el límite de intentos fallidos", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      vi.spyOn(assistantAuthService, "checkOrderRateLimits").mockResolvedValueOnce({
        blocked: true,
        retryAfterSeconds: 300,
      })

      const req = new Request(
        "https://onestar.com.co/api/assistant/order?cedula=12345678&waPhone=573001234567"
      )
      const res = await getOrder(req)

      expect(res.status).toBe(429)
      expect(res.headers.get("Retry-After")).toBe("300")
      const data = await res.json()
      expect(data.error).toMatch(/demasiados intentos fallidos/i)
    })

    it("retorna la respuesta 404 idéntica y registra intento fallido si no hay match", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      vi.spyOn(assistantAuthService, "checkOrderRateLimits").mockResolvedValueOnce({
        blocked: false,
      })

      const recordSpy = vi
        .spyOn(assistantAuthService, "recordOrderFailedAttempt")
        .mockResolvedValueOnce()

      vi.spyOn(assistantService, "searchAssistantOrders").mockResolvedValueOnce(null)

      const req = new Request(
        "https://onestar.com.co/api/assistant/order?cedula=12345678&waPhone=573001234567"
      )
      const res = await getOrder(req)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe("No se encontraron pedidos con los datos suministrados")
      expect(recordSpy).toHaveBeenCalledWith(req.headers, "12345678", "573001234567")
    })

    it("retorna pedidos cuando la verificación es exitosa", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })

      vi.spyOn(assistantAuthService, "checkOrderRateLimits").mockResolvedValueOnce({
        blocked: false,
      })

      vi.spyOn(assistantService, "searchAssistantOrders").mockResolvedValueOnce({
        orders: [
          {
            number: "OS-1001",
            createdAt: "2026-10-15",
            status: "En camino",
            items: "Tenis Vans Asher, talla 8",
            carrier: "Envía",
            trackingNumber: "12345",
            tracking: null,
            trackingUrl: "https://envia.co/rastreo?guia=12345",
            eta: "3 a 5 días hábiles",
          },
        ],
      })

      const req = new Request(
        "https://onestar.com.co/api/assistant/order?cedula=1020304050&waPhone=573001234567"
      )
      const res = await getOrder(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.orders).toHaveLength(1)
      expect(data.orders[0].number).toBe("OS-1001")
    })
  })

  describe("POST /api/assistant/leads, /event y /link", () => {
    it("crea o actualiza un lead normalizando waPhone a dígitos y descartando email/cedula", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })
      vi.spyOn(assistantAuthService, "checkLeadPhoneRateLimit").mockResolvedValueOnce({
        allowed: true,
      })
      const upsertSpy = vi.spyOn(leadService, "upsertLeadByPhone").mockResolvedValueOnce({
        id: "lead_1",
        waPhone: "573001234567",
        name: "Valentina",
        stage: "NUEVO",
        ctwaClid: "ctwa_1",
        consentAt: "2026-10-27T15:00:00.000Z",
        optedOut: false,
      })

      const req = new Request("https://onestar.com.co/api/assistant/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          waPhone: "+57 (300) 123-4567",
          name: "Valentina",
          ctwaClid: "ctwa_1",
          consentimiento: true,
          email: "no-guardar@test.com",
          cedula: "10203040",
        }),
      })

      const res = await postLead(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.lead.waPhone).toBe("573001234567")
      expect(upsertSpy).toHaveBeenCalledWith({
        waPhone: "573001234567",
        name: "Valentina",
        ctwaClid: "ctwa_1",
        consent: true,
        optedOut: undefined,
      })
    })

    it("registra un evento en POST /api/assistant/leads/event", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })
      vi.spyOn(assistantAuthService, "checkLeadPhoneRateLimit").mockResolvedValueOnce({
        allowed: true,
      })
      vi.spyOn(leadService, "recordLeadEvent").mockResolvedValueOnce({
        eventId: "ev_10",
        leadId: "lead_1",
        stage: "INTERESADO",
      })

      const req = new Request("https://onestar.com.co/api/assistant/leads/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          waPhone: "+57 300 123 4567",
          type: "PRODUCT_INTEREST",
          stage: "INTERESADO",
          metadata: { brand: "Vans" },
        }),
      })

      const res = await postLeadEvent(req)
      expect(res.status).toBe(200)
      await expect(res.json()).resolves.toEqual({
        ok: true,
        eventId: "ev_10",
        stage: "INTERESADO",
      })
    })

    it("devuelve { url } en POST /api/assistant/leads/link", async () => {
      vi.spyOn(assistantAuthService, "authenticateAssistantRequest").mockResolvedValueOnce({
        authorized: true,
        apiKey: "valid-key",
      })
      vi.spyOn(assistantAuthService, "checkLeadPhoneRateLimit").mockResolvedValueOnce({
        allowed: true,
      })
      vi.spyOn(leadService, "createShortLink").mockResolvedValueOnce({
        url: "https://onestar.com.co/r/abc12345",
        code: "abc12345",
        leadId: "lead_1",
      })

      const req = new Request("https://onestar.com.co/api/assistant/leads/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          waPhone: "+57 300 123 4567",
          productSlug: "vans-knu-skool",
          utmCampaign: "promo_wa",
        }),
      })

      const res = await postLeadLink(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.url).toBe("https://onestar.com.co/r/abc12345")
      expect(data.code).toBe("abc12345")
    })
  })
})
