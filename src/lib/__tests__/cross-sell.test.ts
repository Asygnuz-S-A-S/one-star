import { describe, expect, it } from "vitest"
import { MAX_CROSS_SELLS, matchCrossSellRefs, parseCrossSellRefs } from "../cross-sell"

describe("parseCrossSellRefs", () => {
  it("separa por coma, punto y coma, barra y salto de línea, sin vacíos ni repetidos", () => {
    expect(parseCrossSellRefs(" A-1, B-2;A-1\nC-3 | ,")).toEqual(["A-1", "B-2", "C-3"])
  })

  it("celda vacía o nula = sin referencias", () => {
    expect(parseCrossSellRefs("")).toEqual([])
    expect(parseCrossSellRefs(undefined)).toEqual([])
    expect(parseCrossSellRefs(null)).toEqual([])
  })

  it(`limita a ${MAX_CROSS_SELLS} referencias`, () => {
    const refs = Array.from({ length: 20 }, (_, i) => `R-${i}`).join(",")
    expect(parseCrossSellRefs(refs)).toHaveLength(MAX_CROSS_SELLS)
  })
})

describe("matchCrossSellRefs", () => {
  const variants = [
    { sku: "1162011-BWHT_9", productId: "p-negro" },
    { sku: "1162011-BWHT_10", productId: "p-negro" },
    { sku: "1162011-GCTC_9", productId: "p-gris" },
  ]

  it("acepta el SKU exacto de una talla o la referencia base del producto", () => {
    const byRef = matchCrossSellRefs(["1162011-GCTC_9", "1162011-BWHT"], variants)
    expect(byRef.get("1162011-GCTC_9")).toBe("p-gris")
    expect(byRef.get("1162011-BWHT")).toBe("p-negro")
  })

  it("no confunde un prefijo con otra referencia (modelo sin color)", () => {
    expect(matchCrossSellRefs(["1162011", "NO-EXISTE"], variants).size).toBe(0)
  })
})
