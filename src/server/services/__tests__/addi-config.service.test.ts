import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("server-only", () => ({}))

import {
  fetchAddiConfig,
  getAddiWidgetEvaluation,
  clearAddiConfigCacheForTesting,
  getAddiAllySlug,
} from "../addi-config.service"

const mockActiveResponse = {
  minAmount: 50000,
  maxAmount: 3000000,
  policy: {
    discount: 10,
    productType: "ADDI_PAGO",
    policyMaxAmount: 600000,
    isVisible: true,
  },
  widgetConfig: {
    widgetVersion: "ADDI_TEMPLATE_01_LOCAL",
    widgetShowPreapproval: true,
  },
  isActiveAlly: true,
  isActivePayNow: true,
}

describe("Addi Config Service", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    clearAddiConfigCacheForTesting()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("utiliza el slug por defecto si no está definida la variable de entorno", () => {
    delete process.env.ADDI_ALLY_SLUG
    expect(getAddiAllySlug()).toBe("onestar-ecommerce")
  })

  it("utiliza la variable de entorno ADDI_ALLY_SLUG si está configurada", () => {
    process.env.ADDI_ALLY_SLUG = "custom-ally"
    expect(getAddiAllySlug()).toBe("custom-ally")
    delete process.env.ADDI_ALLY_SLUG
  })

  it("retorna disponible y en rango para un monto válido", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockActiveResponse,
    }) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(180000)

    expect(result).not.toBeNull()
    expect(result?.available).toBe(true)
    expect(result?.inRange).toBe(true)
    expect(result?.minAmount).toBe(50000)
    expect(result?.maxAmount).toBe(3000000)
    expect(result?.outOfRangeNotice).toBeUndefined()
    expect(result?.requestedAmount).toBe(180000)
  })

  it("retorna no disponible si el aliado está inactivo (isActiveAlly: false)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockActiveResponse,
        isActiveAlly: false,
      }),
    }) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(180000)

    expect(result).not.toBeNull()
    expect(result?.available).toBe(false)
    expect(result?.inRange).toBe(false)
  })

  it("retorna no disponible si la política no es visible (policy.isVisible: false)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...mockActiveResponse,
        policy: {
          ...mockActiveResponse.policy,
          isVisible: false,
        },
      }),
    }) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(180000)

    expect(result).not.toBeNull()
    expect(result?.available).toBe(false)
  })

  it("muestra aviso de rango si el monto está por debajo del mínimo", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockActiveResponse,
    }) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(30000)

    expect(result).not.toBeNull()
    expect(result?.available).toBe(true)
    expect(result?.inRange).toBe(false)
    expect(result?.outOfRangeNotice).toMatch(/Addi aplica para compras entre/i)
    expect(result?.outOfRangeNotice).toContain("50.000")
  })

  it("muestra aviso de rango si el monto está por encima del máximo", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockActiveResponse,
    }) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(4500000)

    expect(result).not.toBeNull()
    expect(result?.available).toBe(true)
    expect(result?.inRange).toBe(false)
    expect(result?.outOfRangeNotice).toMatch(/Addi aplica para compras entre/i)
    expect(result?.outOfRangeNotice).toContain("3.000.000")
  })

  it("maneja errores de red y HTTP 500 silenciosamente sin lanzar excepciones", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout")) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(200000)
    expect(result).toBeNull()

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch

    const result500 = await fetchAddiConfig(200000)
    expect(result500).toBeNull()
  })

  it("nunca altera el precio con el campo policy.discount (es solo visual)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockActiveResponse, // discount: 10
    }) as unknown as typeof fetch

    const result = await getAddiWidgetEvaluation(250000)
    expect(result?.requestedAmount).toBe(250000)
  })
})
