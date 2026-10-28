import { describe, expect, it } from "vitest"

import {
  buildPriceFilterSearch,
  normalizePriceBounds,
  normalizePriceSelection,
  priceRangeStep,
} from "../price-range"

describe("price range filters", () => {
  it("normalizes catalog-derived bounds and keeps the selected range ordered", () => {
    const bounds = normalizePriceBounds({ min: 499_900, max: 1_249_900 })

    expect(bounds).toEqual({ min: 499_900, max: 1_249_900 })
    if (!bounds) throw new Error("Expected bounds")
    expect(normalizePriceSelection({ min: 1_500_000, max: 100_000 }, bounds)).toEqual({
      min: 499_900,
      max: 1_249_900,
    })
    expect(priceRangeStep(bounds)).toBeGreaterThan(0)
  })

  it("does not manufacture a range when catalog prices are empty or invalid", () => {
    expect(normalizePriceBounds({ min: null, max: 100 })).toBeNull()
    expect(normalizePriceBounds({ min: 200, max: 100 })).toBeNull()
  })

  it("keeps explicit apply URL semantics and removes page while omitting catalog-edge values", () => {
    const next = buildPriceFilterSearch(
      "marca=Vans&page=3&precio_min=100",
      { min: 100, max: 900 },
      { min: 100, max: 600 },
    )

    expect(next.toString()).toBe("marca=Vans&precio_max=600")
  })
})
