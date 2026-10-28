import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

vi.mock("server-only", () => ({}))

import { EnviaShippingTrackingAdapter } from "../adapters/envia.adapter"
import { NullShippingTrackingAdapter } from "../adapters/null.adapter"
import {
  getShippingTrackingAdapter,
  resetShippingTrackingAdapter,
} from "../tracking.container"

describe("EnviaShippingTrackingAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetShippingTrackingAdapter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("retorna null si no se configuran apiUrl o apiToken", async () => {
    const adapter = new EnviaShippingTrackingAdapter({
      apiUrl: undefined,
      apiToken: undefined,
    })

    const result = await adapter.getTracking("GUIA123456")
    expect(result).toBeNull()
  })

  it("construye trackingUrl a partir de la plantilla", () => {
    const adapter = new EnviaShippingTrackingAdapter({
      urlTemplate: "https://envia.co/rastreo?guia={guia}",
    })

    expect(adapter.buildTrackingUrl("123456789")).toBe(
      "https://envia.co/rastreo?guia=123456789"
    )
    expect(adapter.buildTrackingUrl(" GUIA 999 ")).toBe(
      "https://envia.co/rastreo?guia=GUIA%20999"
    )
    expect(adapter.buildTrackingUrl("")).toBeNull()
  })

  it("consulta la API y normaliza la respuesta con éxito", async () => {
    const mockResponse = {
      state: "En camino",
      lastEvent: "Salió de centro de distribución",
      city: "Bogotá",
      at: "2026-10-27T10:00:00Z",
    }

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const adapter = new EnviaShippingTrackingAdapter({
      apiUrl: "https://api.envia.test/tracking/{guia}",
      apiToken: "test-token",
    })

    const result = await adapter.getTracking("GUIA123")
    expect(result).toEqual({
      state: "En camino",
      lastEvent: "Salió de centro de distribución",
      city: "Bogotá",
      at: "2026-10-27T10:00:00Z",
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.envia.test/tracking/GUIA123",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    )
  })

  it("normaliza nombres de propiedades en español y anidadas", async () => {
    const mockResponse = {
      data: {
        estado: "Entregado",
        ultimoEvento: "Entregado a destinatario",
        ciudad: "Medellín",
        fecha: "2026-10-26T15:30:00Z",
      },
    }

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const adapter = new EnviaShippingTrackingAdapter({
      apiUrl: "https://api.envia.test/tracking",
      apiToken: "test-token",
    })

    const result = await adapter.getTracking("GUIA456")
    expect(result).toEqual({
      state: "Entregado",
      lastEvent: "Entregado a destinatario",
      city: "Medellín",
      at: "2026-10-26T15:30:00Z",
    })
  })

  it("devuelve null sin lanzar error si la API responde con status no ok (404, 500)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const adapter = new EnviaShippingTrackingAdapter({
      apiUrl: "https://api.envia.test/tracking/{guia}",
      apiToken: "test-token",
    })

    const result = await adapter.getTracking("GUIA_ERROR")
    expect(result).toBeNull()
  })

  it("devuelve null sin lanzar error si fetch falla por timeout o error de red", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network timeout"))

    const adapter = new EnviaShippingTrackingAdapter({
      apiUrl: "https://api.envia.test/tracking/{guia}",
      apiToken: "test-token",
    })

    const result = await adapter.getTracking("GUIA_TIMEOUT")
    expect(result).toBeNull()
  })

  it("guarda en caché por 15 minutos y no vuelve a consultar la API", async () => {
    const mockResponse = {
      state: "En reparto",
      lastEvent: "Salió a reparto",
      city: "Pereira",
      at: "2026-10-27T08:00:00Z",
    }

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response)

    const adapter = new EnviaShippingTrackingAdapter({
      apiUrl: "https://api.envia.test/tracking/{guia}",
      apiToken: "test-token",
    })

    // Primera llamada
    const result1 = await adapter.getTracking("GUIA_CACHE")
    expect(result1).not.toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Segunda llamada inmediata
    const result2 = await adapter.getTracking("GUIA_CACHE")
    expect(result2).toEqual(result1)
    expect(fetchSpy).toHaveBeenCalledTimes(1) // No llamó de nuevo a fetch
  })
})

describe("NullShippingTrackingAdapter & tracking.container", () => {
  beforeEach(() => {
    resetShippingTrackingAdapter()
  })

  it("NullShippingTrackingAdapter retorna null en getTracking y arma URL", async () => {
    const adapter = new NullShippingTrackingAdapter()
    const result = await adapter.getTracking("123")
    expect(result).toBeNull()
    expect(adapter.buildTrackingUrl("123")).toContain("123")
  })

  it("getShippingTrackingAdapter entrega EnviaShippingTrackingAdapter por defecto", () => {
    const adapter = getShippingTrackingAdapter("ENVIA")
    expect(adapter).toBeInstanceOf(EnviaShippingTrackingAdapter)
  })

  it("getShippingTrackingAdapter entrega NullShippingTrackingAdapter para carrier OTHER", () => {
    const adapter = getShippingTrackingAdapter("OTHER")
    expect(adapter).toBeInstanceOf(NullShippingTrackingAdapter)
  })
})
