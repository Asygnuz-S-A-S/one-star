import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

import { GET as getProducts } from "../products/route"
import { GET as getStock } from "../stock/route"
import { GET as getOrder } from "../order/route"
import * as assistantAuthService from "@/server/services/assistant-auth.service"
import * as assistantService from "@/server/services/assistant.service"

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
})
