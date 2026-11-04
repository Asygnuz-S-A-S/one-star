import { describe, expect, it } from "vitest"
import { summarizeCartData } from "./cart-data"

describe("summarizeCartData", () => {
  const items = [
    { price: 100, quantity: 2 },
    { unitPrice: 50 },
  ]

  it("suma la lista que guarda el checkout", () => {
    expect(summarizeCartData(items)).toEqual({ itemsCount: 2, value: 250 })
  })

  it("mantiene los formatos anteriores", () => {
    expect(summarizeCartData({ items })).toEqual({ itemsCount: 2, value: 250 })
    expect(summarizeCartData({ total: 900 })).toEqual({ itemsCount: 0, value: 900 })
  })

  it("devuelve cero con datos vacíos o inválidos", () => {
    expect(summarizeCartData(null)).toEqual({ itemsCount: 0, value: 0 })
    expect(summarizeCartData("x")).toEqual({ itemsCount: 0, value: 0 })
  })
})
