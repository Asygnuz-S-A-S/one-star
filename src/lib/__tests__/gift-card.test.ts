import { describe, expect, it } from "vitest"
import { createGiftCardCartItem } from "@/lib/gift-card"

describe("gift card", () => {
  it("crea un ítem de carrito para un monto permitido", () => {
    expect(createGiftCardCartItem(100_000)).toMatchObject({
      id: "gift-card-100000",
      productId: "gift-card-100000",
      kind: "gift_card",
      name: "Tarjeta de Regalo $100.000",
      price: 100_000,
      originalPrice: 100_000,
      quantity: 1,
      sku: "GIFT-CARD-100000",
    })
  })

  it("rechaza montos personalizados fuera del rango permitido", () => {
    expect(() => createGiftCardCartItem(19_999)).toThrow("entre $20.000 y $2.000.000")
  })
})
