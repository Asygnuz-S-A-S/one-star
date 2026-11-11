import { describe, expect, it } from "vitest"
import { DEFAULT_STOREFRONT_SETTINGS, parseStorefrontSettings } from "../storefront-settings"

describe("parseStorefrontSettings", () => {
  it("sin nada guardado usa los textos por defecto", () => {
    expect(parseStorefrontSettings(null)).toEqual(DEFAULT_STOREFRONT_SETTINGS)
    expect(parseStorefrontSettings([])).toEqual(DEFAULT_STOREFRONT_SETTINGS)
  })

  it("respeta lo guardado y rellena lo vacío", () => {
    const parsed = parseStorefrontSettings({ addToCartLabel: "  Añadir  ", buyNowLabel: "", autoPublishReviews: true })
    expect(parsed.addToCartLabel).toBe("Añadir")
    expect(parsed.buyNowLabel).toBe(DEFAULT_STOREFRONT_SETTINGS.buyNowLabel)
    expect(parsed.storeStockText).toBe(DEFAULT_STOREFRONT_SETTINGS.storeStockText)
    expect(parsed.autoPublishReviews).toBe(true)
  })

  it("corta textos demasiado largos", () => {
    expect(parseStorefrontSettings({ addToCartLabel: "x".repeat(80) }).addToCartLabel).toHaveLength(40)
  })
})
