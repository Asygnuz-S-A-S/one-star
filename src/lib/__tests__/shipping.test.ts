import { describe, expect, it } from "vitest"

import {
  EXPRESS_SHIPPING_COST,
  STANDARD_SHIPPING_COST,
  STANDARD_SHIPPING_THRESHOLD,
  getShippingCost,
} from "@/lib/shipping"

describe("getShippingCost", () => {
  it("cobra el estándar por debajo del umbral y lo regala desde el umbral", () => {
    expect(getShippingCost("standard", STANDARD_SHIPPING_THRESHOLD - 1)).toBe(STANDARD_SHIPPING_COST)
    expect(getShippingCost("standard", STANDARD_SHIPPING_THRESHOLD)).toBe(0)
  })

  it("el express siempre se cobra", () => {
    expect(getShippingCost("express", STANDARD_SHIPPING_THRESHOLD * 2)).toBe(EXPRESS_SHIPPING_COST)
  })

  it("un pedido solo digital nunca paga envío, sea cual sea el método", () => {
    expect(getShippingCost("standard", 50_000, { digitalOnly: true })).toBe(0)
    expect(getShippingCost("express", 50_000, { digitalOnly: true })).toBe(0)
  })
})
