import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { detectLoggroOnlineExclusion } from "../loggro-online-availability"

describe("detectLoggroOnlineExclusion", () => {
  it("identifica como interno el empaque del código auditado de bolsas", () => {
    expect(detectLoggroOnlineExclusion({
      brandCode: "011",
      name: "BOLSA TELA GRIS GRANDE",
      basePrice: 2_000,
    })).toBe("INTERNAL_ITEM")
  })

  it("identifica obsequios aunque Loggro contenga la falta ortográfica observada", () => {
    expect([
      detectLoggroOnlineExclusion({
        brandCode: "008",
        name: "CORDONES CONVERSE SUELTOS OBSEQUIO",
        basePrice: 5_000,
      }),
      detectLoggroOnlineExclusion({
        brandCode: "008",
        name: "MEDIAS CONVERSE OBSEGUIOS",
        basePrice: 5_000,
      }),
    ]).toEqual(["GIFT", "GIFT"])
  })

  it("bloquea artículos de prueba y precios no positivos sin ocultar una bolsa comercial", () => {
    expect([
      detectLoggroOnlineExclusion({
        brandCode: "005",
        name: "TENIS NEW BALANCE DE PRUEBA",
        basePrice: 100_000,
      }),
      detectLoggroOnlineExclusion({
        brandCode: "002",
        name: "NIKE TEST",
        basePrice: 100_000,
      }),
      detectLoggroOnlineExclusion({
        brandCode: "004",
        name: "TENIS SKECHERS MUJER",
        basePrice: 0,
      }),
      detectLoggroOnlineExclusion({
        brandCode: "020",
        name: "BOLSA COMERCIAL MUJER",
        basePrice: 120_000,
      }),
    ]).toEqual(["TEST_ITEM", "TEST_ITEM", "NON_POSITIVE_PRICE", undefined])
  })
})
