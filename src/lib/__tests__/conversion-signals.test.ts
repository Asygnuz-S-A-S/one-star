import { describe, expect, it } from "vitest"

import {
  LOW_STOCK_THRESHOLD,
  MAX_CONVERSION_SIGNALS,
  getConversionSignals,
} from "../conversion-signals"

const base = { price: 349_000, selectedVariantStock: null, totalStock: 20 }

describe("getConversionSignals", () => {
  it("un producto sobre el umbral muestra envío gratis y plazo de entrega", () => {
    // Arrange / Act
    const signals = getConversionSignals(base)

    // Assert
    expect(signals.map((s) => s.kind)).toEqual(["shipping", "delivery"])
    expect(signals[0].text).toMatch(/Envío gratis/)
    expect(signals[1].text).toMatch(/3 a 5 días hábiles/)
  })

  it("bajo el umbral dice cuánto falta para el envío gratis", () => {
    const [shipping] = getConversionSignals({ ...base, price: 150_000 })

    expect(shipping.text).toMatch(/Te faltan \$\s?50\.000 para el envío gratis/)
  })

  it("con una sola unidad en la talla elegida avisa 'última unidad', en rojo", () => {
    const [scarcity] = getConversionSignals({ ...base, selectedVariantStock: 1, selectedSize: "9" })

    expect(scarcity).toEqual({ kind: "scarcity", text: "Última unidad en talla 9", tone: "urgent" })
  })

  it("con pocas unidades en la talla elegida dice cuántas quedan", () => {
    const [scarcity] = getConversionSignals({
      ...base,
      selectedVariantStock: LOW_STOCK_THRESHOLD,
      selectedSize: "8",
    })

    expect(scarcity.text).toBe(`Solo quedan ${LOW_STOCK_THRESHOLD} en talla 8`)
  })

  it("no avisa escasez cuando la talla elegida tiene stock de sobra ni cuando está agotada", () => {
    expect(getConversionSignals({ ...base, selectedVariantStock: 10 }).map((s) => s.kind)).not.toContain("scarcity")
    expect(getConversionSignals({ ...base, selectedVariantStock: 0 }).map((s) => s.kind)).not.toContain("scarcity")
  })

  it("sin talla elegida, avisa 'quedan pocas' solo si el total es bajo", () => {
    expect(getConversionSignals({ ...base, totalStock: 2 })[0].text).toBe("Quedan pocas unidades")
    expect(getConversionSignals({ ...base, totalStock: 8 }).map((s) => s.kind)).not.toContain("scarcity")
  })

  it("una tarjeta de regalo no muestra ningún mensaje", () => {
    expect(getConversionSignals({ ...base, isDigital: true })).toEqual([])
  })

  it("nunca muestra más mensajes que el máximo permitido", () => {
    const signals = getConversionSignals({ ...base, selectedVariantStock: 1, selectedSize: "7" })

    expect(signals.length).toBeLessThanOrEqual(MAX_CONVERSION_SIGNALS)
  })
})
