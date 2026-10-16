import { describe, expect, it } from "vitest"
import { CART_STORAGE_VERSION, migratePersistedCart } from "@/store/cart.store"

const legacyGiftCard = {
  id: "gift-card-100000",
  productId: "gift-card-100000",
  slug: "tarjeta-regalo",
  name: "Tarjeta de Regalo $100.000",
  brand: "One Star",
  imageUrl: null,
  size: "Digital",
  color: "Rojo One Star",
  price: 100_000,
  originalPrice: 100_000,
  quantity: 1,
  sku: "GIFT-CARD-100000",
}

const producto = { ...legacyGiftCard, id: "var_1", productId: "prod_1", price: 50_000, originalPrice: 50_000, sku: "SKU-1" }

describe("migración del carrito persistido", () => {
  it("descarta las tarjetas de regalo heredadas que el checkout no puede tasar", () => {
    const migrated = migratePersistedCart({ items: [legacyGiftCard, producto] }, 0)

    expect(migrated.items).toEqual([producto])
  })

  it("recalcula los totales después de limpiar", () => {
    const migrated = migratePersistedCart({ items: [legacyGiftCard, producto] }, 0)

    expect(migrated.totalItems).toBe(1)
    expect(migrated.subtotal).toBe(50_000)
  })

  it("no toca los carritos que ya están en la versión vigente", () => {
    const migrated = migratePersistedCart(
      { items: [producto] },
      CART_STORAGE_VERSION
    )

    expect(migrated.items).toEqual([producto])
  })

  it("tolera un estado persistido corrupto o vacío", () => {
    expect(migratePersistedCart(undefined, 0)).toEqual({
      items: [],
      totalItems: 0,
      subtotal: 0,
    })
  })
})
