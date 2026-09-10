import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { DEFAULT_LOGGRO_IVA_RATE, applyIva, resolveLoggroIvaRate } from "../loggro-pricing"

describe("applyIva", () => {
  it("suma el 19 % al precio neto y redondea al peso", () => {
    // Caso real de Loggro: 293.277 neto → 348.999,63 → 349.000
    expect(applyIva(293_277, 0.19)).toBe(349_000)
    expect(applyIva(209_243, 0.19)).toBe(248_999)
    expect(applyIva(100_000, 0.19)).toBe(119_000)
  })

  it("devuelve el precio neto intacto cuando la tasa es cero", () => {
    expect(applyIva(293_277, 0)).toBe(293_277)
  })

  it("no toca precios no numéricos ni el cero", () => {
    expect(applyIva(0, 0.19)).toBe(0)
    expect(applyIva(Number.NaN, 0.19)).toBeNaN()
  })
})

describe("resolveLoggroIvaRate", () => {
  it("usa el 19 % cuando la variable no está definida o está vacía", () => {
    expect(resolveLoggroIvaRate(undefined)).toBe(DEFAULT_LOGGRO_IVA_RATE)
    expect(resolveLoggroIvaRate("")).toBe(DEFAULT_LOGGRO_IVA_RATE)
    expect(resolveLoggroIvaRate("  ")).toBe(DEFAULT_LOGGRO_IVA_RATE)
  })

  it("acepta la tasa como fracción o como porcentaje", () => {
    expect(resolveLoggroIvaRate("0.19")).toBe(0.19)
    expect(resolveLoggroIvaRate("0,05")).toBe(0.05)
    expect(resolveLoggroIvaRate("19")).toBe(0.19)
    expect(resolveLoggroIvaRate("5")).toBe(0.05)
  })

  it("permite desactivar el IVA con cero", () => {
    expect(resolveLoggroIvaRate("0")).toBe(0)
  })

  it("cae al 19 % ante valores inválidos para no publicar precios netos", () => {
    expect(resolveLoggroIvaRate("abc")).toBe(DEFAULT_LOGGRO_IVA_RATE)
    expect(resolveLoggroIvaRate("-1")).toBe(DEFAULT_LOGGRO_IVA_RATE)
    expect(resolveLoggroIvaRate("150")).toBe(DEFAULT_LOGGRO_IVA_RATE)
  })
})
