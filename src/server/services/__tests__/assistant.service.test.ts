import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

import {
  searchAssistantProducts,
  checkAssistantStock,
  searchAssistantOrders,
} from "../assistant.service"
import * as productService from "../product.service"
import * as assistantRepo from "../../repositories/assistant.repository"
import * as trackingModule from "../../shipping/tracking"

describe("assistant.service", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe("searchAssistantProducts", () => {
    it("devuelve productos formateados según el contrato sin cantidades exactas", async () => {
      const mockProduct: productService.ProductDTO = {
        id: "prod-1",
        slug: "tenis-vans-asher-verde",
        name: "Tenis Vans Asher Verde",
        erpId: "LOG-1",
        brandId: "b-1",
        brandName: "Vans",
        brand: "Vans",
        basePrice: 249900,
        isOnSale: false,
        salePrice: null,
        description: "Desc",
        extendedDescription: null,
        videoUrl: null,
        metaTitle: null,
        metaDescription: null,
        highlights: [],
        faqs: [],
        gender: "UNISEX",
        categoryId: "cat-1",
        category: { id: "cat-1", name: "Lifestyle", slug: "lifestyle" },
        availableOnline: true,
        availableInStores: true,
        isPublished: true,
        images: [{ id: "img-1", url: "https://img.test/1.jpg", alt: "Vans", position: 0, color: "Verde" }],
        variants: [
          { id: "v-1", sku: "VN-01_6.5", size: "6.5", color: "Verde", stock: 5, inventory: [], sizeUS: null, sizeCM: null, sizeEUR: null },
          { id: "v-2", sku: "VN-01_7", size: "7", color: "Verde", stock: 2, inventory: [], sizeUS: null, sizeCM: null, sizeEUR: null },
          { id: "v-3", sku: "VN-01_8", size: "8", color: "Verde", stock: 0, inventory: [], sizeUS: null, sizeCM: null, sizeEUR: null },
        ],
        colorSiblings: [],
        crossSells: [],
        hasStock: true,
        isNew: true,
        createdAt: "2026-10-20T00:00:00.000Z",
        updatedAt: "2026-10-20T00:00:00.000Z",
      }

      const getProductsSpy = vi.spyOn(productService, "getProducts").mockResolvedValueOnce({
        products: [mockProduct],
        total: 1,
      })

      const result = await searchAssistantProducts(
        { q: "TÉNIS VÁNS", limit: 5 },
        "https://onestar.com.co"
      )

      expect(getProductsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          q: "tenis vans", // Búsqueda sin tildes ni mayúsculas
          hasStock: "yes",
          status: "active",
        }),
        5
      )

      expect(result.total).toBe(1)
      expect(result.products).toHaveLength(1)
      const p = result.products[0]

      expect(p.name).toBe("Tenis Vans Asher Verde")
      expect(p.brand).toBe("Vans")
      expect(p.category).toBe("Lifestyle")
      expect(p.gender).toBe("unisex")
      expect(p.color).toBe("Verde")
      expect(p.price).toBe(249900)
      expect(p.salePrice).toBeNull()
      expect(p.currency).toBe("COP")
      expect(p.sizesAvailable).toEqual(["6.5", "7"]) // No incluye la talla 8 con stock 0
      expect(p.inStock).toBe(true)
      expect(p.url).toBe("https://onestar.com.co/productos/tenis-vans-asher-verde")
      expect(p.imageUrl).toBe("https://img.test/1.jpg")

      // Asegurar que no se filtran cantidades exactas de stock
      expect(p).not.toHaveProperty("stock")
      expect(p).not.toHaveProperty("variants")
    })
  })

  describe("checkAssistantStock", () => {
    const mockDbProduct = {
      id: "prod-1",
      slug: "vans-knu-skool",
      name: "Tenis Vans Knu Skool",
      basePrice: 429000 as unknown,
      isOnSale: false,
      salePrice: null as unknown,
      isPublished: true,
      variants: [
        { id: "v-1", sku: "VN001_8", size: "8", color: "Negro", stock: 5 },
        { id: "v-2", sku: "VN001_8.5", size: "8.5", color: "Negro", stock: 2 },
        { id: "v-3", sku: "VN001_9", size: "9", color: "Negro", stock: 0 },
      ],
    }

    it("devuelve available: true y lowStock: false cuando el stock es mayor a 2", async () => {
      vi.spyOn(assistantRepo, "findProductForStockCheck").mockResolvedValueOnce(mockDbProduct as never)

      const result = await checkAssistantStock(
        { product: "vans-knu-skool", size: "8" },
        "https://onestar.com.co"
      )

      expect(result).not.toBeNull()
      expect(result).toEqual({
        product: "Tenis Vans Knu Skool",
        size: "8",
        available: true,
        lowStock: false,
        price: 429000,
        currency: "COP",
        url: "https://onestar.com.co/productos/vans-knu-skool",
      })

      // Nunca devuelve la cantidad exacta de inventario
      expect(result).not.toHaveProperty("stock")
      expect(result).not.toHaveProperty("quantity")
    })

    it("devuelve lowStock: true cuando hay 2 o menos unidades disponibles", async () => {
      vi.spyOn(assistantRepo, "findProductForStockCheck").mockResolvedValueOnce(mockDbProduct as never)

      const result = await checkAssistantStock(
        { product: "VN001", size: "8.5" },
        "https://onestar.com.co"
      )

      expect(result).not.toBeNull()
      expect(result?.available).toBe(true)
      expect(result?.lowStock).toBe(true)
    })

    it("devuelve available: false y sizesAvailable cuando la talla no tiene stock o no existe", async () => {
      vi.spyOn(assistantRepo, "findProductForStockCheck").mockResolvedValueOnce(mockDbProduct as never)

      const result = await checkAssistantStock(
        { product: "Tenis Vans Knu Skool", size: "10" },
        "https://onestar.com.co"
      )

      expect(result).not.toBeNull()
      expect(result?.available).toBe(false)
      expect(result?.lowStock).toBe(false)
      expect(result?.sizesAvailable).toEqual(["8", "8.5"])
    })

    it("retorna null si el producto no existe", async () => {
      vi.spyOn(assistantRepo, "findProductForStockCheck").mockResolvedValueOnce(null)

      const result = await checkAssistantStock(
        { product: "inexistente", size: "8" },
        "https://onestar.com.co"
      )

      expect(result).toBeNull()
    })
  })

  describe("searchAssistantOrders", () => {
    const mockOrder = {
      id: "clorder12345678",
      createdAt: new Date("2026-10-15T12:00:00Z"),
      status: "SHIPPED",
      customerDocument: "1020304050",
      customerPhone: "3001234567",
      carrier: "ENVIA" as const,
      trackingNumber: "0123456789",
      shippingAddress: {
        fullName: "Juan Perez",
        cedula: "1020304050",
        phone: "3001234567",
        address: "Calle 10 # 20-30",
      },
      items: [
        {
          product: { id: "p-1", name: "Tenis Vans Knu Skool Negro", slug: "vans-knu" },
          variant: { id: "v-1", size: "8", color: "Negro", sku: "VN-01" },
        },
      ],
    }

    it("retorna el pedido verificado por cédula y últimos 10 dígitos de waPhone", async () => {
      vi.spyOn(assistantRepo, "findOrdersForAssistant").mockResolvedValueOnce([mockOrder] as never)

      const mockTrackingPort = {
        getTracking: vi.fn().mockResolvedValueOnce({
          state: "En reparto",
          lastEvent: "Salió a reparto",
          city: "Pereira",
          at: "2026-10-20T08:15:00-05:00",
        }),
        buildTrackingUrl: vi.fn().mockReturnValueOnce("https://envia.co/rastreo?guia=0123456789"),
      }
      vi.spyOn(trackingModule, "getShippingTrackingAdapter").mockReturnValue(mockTrackingPort)

      const result = await searchAssistantOrders({
        cedula: "1020304050",
        waPhone: "573001234567", // Con prefijo de país 57
      })

      expect(result).not.toBeNull()
      expect(result?.orders).toHaveLength(1)
      const order = result?.orders[0]

      expect(order?.number).toBe("OS-12345678")
      expect(order?.createdAt).toBe("2026-10-15")
      expect(order?.status).toBe("En camino")
      expect(order?.items).toBe("Tenis Vans Knu Skool Negro, talla 8")
      expect(order?.carrier).toBe("Envía")
      expect(order?.trackingNumber).toBe("0123456789")
      expect(order?.trackingUrl).toBe("https://envia.co/rastreo?guia=0123456789")
      expect(order?.tracking).toEqual({
        state: "En reparto",
        lastEvent: "Salió a reparto",
        city: "Pereira",
        at: "2026-10-20T08:15:00-05:00",
      })
      expect(order?.eta).toBe("3 a 5 días hábiles")

      // NO debe haber datos personales (PII)
      expect(order).not.toHaveProperty("customerName")
      expect(order).not.toHaveProperty("customerEmail")
      expect(order).not.toHaveProperty("customerPhone")
      expect(order).not.toHaveProperty("customerDocument")
      expect(order).not.toHaveProperty("shippingAddress")
    })

    it("verifica por número de pedido cuando el waPhone no coincide con el del pedido", async () => {
      vi.spyOn(assistantRepo, "findOrdersForAssistant").mockResolvedValueOnce([mockOrder] as never)

      const mockTrackingPort = {
        getTracking: vi.fn().mockResolvedValue(null),
        buildTrackingUrl: vi.fn().mockReturnValue("https://envia.co/rastreo?guia=0123456789"),
      }
      vi.spyOn(trackingModule, "getShippingTrackingAdapter").mockReturnValue(mockTrackingPort)

      // Teléfono de WhatsApp distinto pero envía el número de pedido exacto
      const result = await searchAssistantOrders({
        cedula: "1020304050",
        waPhone: "573119999999",
        number: "OS-12345678",
      })

      expect(result).not.toBeNull()
      expect(result?.orders).toHaveLength(1)
      expect(result?.orders[0].number).toBe("OS-12345678")
    })

    it("retorna null si la cédula no coincide", async () => {
      vi.spyOn(assistantRepo, "findOrdersForAssistant").mockResolvedValueOnce([])

      const result = await searchAssistantOrders({
        cedula: "999999999",
        waPhone: "573001234567",
      })

      expect(result).toBeNull()
    })

    it("retorna null si el waPhone no coincide y no se suministra el número correcto", async () => {
      vi.spyOn(assistantRepo, "findOrdersForAssistant").mockResolvedValueOnce([mockOrder] as never)

      const result = await searchAssistantOrders({
        cedula: "1020304050",
        waPhone: "573119999999", // Teléfono no coincide
        number: "OS-DISTINTO",
      })

      expect(result).toBeNull()
    })

    it("devuelve tracking: null sin romper el endpoint si la transportadora falla", async () => {
      vi.spyOn(assistantRepo, "findOrdersForAssistant").mockResolvedValueOnce([mockOrder] as never)

      const mockTrackingPort = {
        getTracking: vi.fn().mockResolvedValueOnce(null), // Falla o sin credenciales
        buildTrackingUrl: vi.fn().mockReturnValueOnce("https://envia.co/rastreo?guia=0123456789"),
      }
      vi.spyOn(trackingModule, "getShippingTrackingAdapter").mockReturnValue(mockTrackingPort)

      const result = await searchAssistantOrders({
        cedula: "1020304050",
        waPhone: "573001234567",
      })

      expect(result).not.toBeNull()
      expect(result?.orders[0].tracking).toBeNull()
      expect(result?.orders[0].carrier).toBe("Envía")
      expect(result?.orders[0].trackingUrl).toBe("https://envia.co/rastreo?guia=0123456789")
    })
  })
})
