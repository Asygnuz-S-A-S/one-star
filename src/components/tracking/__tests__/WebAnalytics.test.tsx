import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isAdminPath, sendHit } from "../WebAnalytics"

describe("WebAnalytics tracking logic", () => {
  let mockSendBeacon: ReturnType<typeof vi.fn>
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSendBeacon = vi.fn().mockReturnValue(true)
    mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

    vi.stubGlobal("navigator", {
      sendBeacon: mockSendBeacon,
    })
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("isAdminPath", () => {
    it("reconoce /admin y subrutas como administrativas", () => {
      expect(isAdminPath("/admin")).toBe(true)
      expect(isAdminPath("/admin/pedidos")).toBe(true)
      expect(isAdminPath("/admin/inventario/nuevo")).toBe(true)
    })

    it("no confunde rutas de la tienda pública con admin", () => {
      expect(isAdminPath("/")).toBe(false)
      expect(isAdminPath("/productos")).toBe(false)
      expect(isAdminPath("/hombre")).toBe(false)
      expect(isAdminPath("/checkout")).toBe(false)
      expect(isAdminPath("/administrador")).toBe(false)
    })
  })

  describe("sendHit", () => {
    it("entrega el hit vía navigator.sendBeacon con un Blob application/json", async () => {
      sendHit("/productos", "talla=40", "https://google.com")

      expect(mockSendBeacon).toHaveBeenCalledTimes(1)
      const [endpoint, blob] = mockSendBeacon.mock.calls[0]
      expect(endpoint).toBe("/api/track")
      expect(blob).toBeInstanceOf(Blob)

      const text = await (blob as Blob).text()
      const payload = JSON.parse(text)
      expect(payload).toEqual({
        path: "/productos",
        query: "talla=40",
        referrer: "https://google.com",
      })
    })

    it("pasa null en referrer si viene vacío", async () => {
      sendHit("/hombre", "", "")

      const [, blob] = mockSendBeacon.mock.calls[0]
      const text = await (blob as Blob).text()
      const payload = JSON.parse(text)
      expect(payload.referrer).toBeNull()
    })

    it("hace fallback a fetch con keepalive si sendBeacon falla", () => {
      mockSendBeacon.mockReturnValue(false)

      sendHit("/productos/tenis", "", "")

      expect(mockSendBeacon).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/track",
        expect.objectContaining({
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }),
      )
    })

    it("hace fallback a fetch si navigator.sendBeacon no existe en el navegador", () => {
      vi.stubGlobal("navigator", {}) // sin sendBeacon

      sendHit("/buscar", "q=nike", "")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/track",
        expect.objectContaining({
          method: "POST",
          keepalive: true,
        }),
      )
    })

    it("no lanza excepciones si fetch rechaza", () => {
      vi.stubGlobal("navigator", {})
      mockFetch.mockRejectedValue(new Error("Network failure"))

      expect(() => {
        sendHit("/checkout", "", "")
      }).not.toThrow()
    })
  })
})
