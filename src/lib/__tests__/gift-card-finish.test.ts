import { describe, expect, it } from "vitest"

import { getGiftCardFinish } from "../gift-card"

describe("getGiftCardFinish", () => {
  const amounts = [50_000, 100_000, 200_000, 300_000, 500_000]

  it("reparte los montos en cobre, plata y oro de menor a mayor", () => {
    expect(amounts.map((amount) => getGiftCardFinish(amount, amounts))).toEqual(["copper", "copper", "silver", "silver", "gold"])
  })

  it("con un solo monto usa cobre y con tres asigna uno por acabado", () => {
    expect(getGiftCardFinish(80_000, [80_000])).toBe("copper")
    expect([1, 2, 3].map((amount) => getGiftCardFinish(amount, [3, 1, 2]))).toEqual(["copper", "silver", "gold"])
  })
})
