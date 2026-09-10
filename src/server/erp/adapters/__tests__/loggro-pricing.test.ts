import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  DEFAULT_LOGGRO_IVA_RATE,
  applyIva,
  parseLoggroItemIvaRate,
  resolveLoggroIvaRate,
} from "../loggro-pricing"

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

describe("parseLoggroItemIvaRate", () => {
  it("convierte el porcentaje ivaVenta del ítem en tasa", () => {
    expect(parseLoggroItemIvaRate("19.00")).toBe(0.19)
    expect(parseLoggroItemIvaRate("5.00")).toBe(0.05)
    expect(parseLoggroItemIvaRate("19,00")).toBe(0.19)
    expect(parseLoggroItemIvaRate(19)).toBe(0.19)
    expect(parseLoggroItemIvaRate(" 19 ")).toBe(0.19)
  })

  it("acepta cero como ítem exento", () => {
    expect(parseLoggroItemIvaRate("0")).toBe(0)
    expect(parseLoggroItemIvaRate("0.00")).toBe(0)
    expect(parseLoggroItemIvaRate(0)).toBe(0)
  })

  it("acepta la tasa como fracción por si Loggro la envía así", () => {
    expect(parseLoggroItemIvaRate("0.19")).toBe(0.19)
    expect(parseLoggroItemIvaRate(0.05)).toBe(0.05)
  })

  it("devuelve undefined cuando falta, para caer a la tasa global", () => {
    expect(parseLoggroItemIvaRate(undefined)).toBeUndefined()
    expect(parseLoggroItemIvaRate(null)).toBeUndefined()
    expect(parseLoggroItemIvaRate("")).toBeUndefined()
    expect(parseLoggroItemIvaRate("   ")).toBeUndefined()
  })

  it("devuelve undefined ante valores inválidos o fuera de rango", () => {
    expect(parseLoggroItemIvaRate("abc")).toBeUndefined()
    expect(parseLoggroItemIvaRate("-5")).toBeUndefined()
    expect(parseLoggroItemIvaRate("100")).toBeUndefined()
    expect(parseLoggroItemIvaRate("150")).toBeUndefined()
    expect(parseLoggroItemIvaRate(Number.NaN)).toBeUndefined()
    expect(parseLoggroItemIvaRate(Number.POSITIVE_INFINITY)).toBeUndefined()
  })
})
