import { describe, expect, it } from "vitest"
import {
  createGiftCardCartItem,
  giftCardSku,
  giftCardSlug,
  isLegacyGiftCardCartItemId,
  isValidGiftCardAmount,
  type GiftCardOption,
} from "@/lib/gift-card"

const option: GiftCardOption = {
  variantId: "var_abc123",
  productId: "prod_abc123",
  sku: "GIFT-CARD-100000",
  amount: 100_000,
}

describe("gift card", () => {
  it("usa el id de la variante real como id del ítem, que es lo que envía el checkout", () => {
    expect(createGiftCardCartItem(option)).toMatchObject({
      id: "var_abc123",
      productId: "prod_abc123",
      kind: "gift_card",
      name: "Tarjeta de Regalo $100.000",
      slug: "tarjeta-regalo-100000",
      price: 100_000,
      originalPrice: 100_000,
      quantity: 1,
      sku: "GIFT-CARD-100000",
    })
  })

  it("rechaza montos fuera del rango permitido", () => {
    expect(() => createGiftCardCartItem({ ...option, amount: 19_999 })).toThrow(
      "entre $20.000 y $2.000.000"
    )
  })

  it("rechaza una opción sin variante real en lugar de crear un ítem impagable", () => {
    expect(() => createGiftCardCartItem({ ...option, variantId: "" })).toThrow(
      "no está disponible"
    )
  })

  it("valida el rango de montos", () => {
    expect(isValidGiftCardAmount(20_000)).toBe(true)
    expect(isValidGiftCardAmount(2_000_000)).toBe(true)
    expect(isValidGiftCardAmount(19_999)).toBe(false)
    expect(isValidGiftCardAmount(2_000_001)).toBe(false)
    expect(isValidGiftCardAmount(50_000.5)).toBe(false)
  })

  it("deriva slug y sku desde el monto, igual que el seed del catálogo", () => {
    expect(giftCardSlug(50_000)).toBe("tarjeta-regalo-50000")
    expect(giftCardSku(50_000)).toBe("GIFT-CARD-50000")
  })

  it("reconoce los ítems de carrito heredados con id ficticio", () => {
    expect(isLegacyGiftCardCartItemId("gift-card-50000")).toBe(true)
    expect(isLegacyGiftCardCartItemId("var_abc123")).toBe(false)
  })
})
