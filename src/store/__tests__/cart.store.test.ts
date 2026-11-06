import { describe, expect, it, vi } from "vitest"
// El entorno node de vitest no trae localStorage: la persistencia del carrito usa uno en memoria.
vi.hoisted(() => {
  const memory = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  } as Storage
})

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

describe("tope de stock en la bolsa", () => {
  it("no deja pasar del stock al agregar ni al subir la cantidad", async () => {
    const { useCartStore } = await import("@/store/cart.store")
    const { quantity: _q, ...item } = producto
    void _q
    useCartStore.getState().clearCart()

    useCartStore.getState().addItem({ ...item, maxQuantity: 2 })
    useCartStore.getState().addItem({ ...item, maxQuantity: 2 })
    useCartStore.getState().addItem({ ...item, maxQuantity: 2 })
    expect(useCartStore.getState().items[0].quantity).toBe(2)

    useCartStore.getState().updateQuantity(item.id, 13)
    expect(useCartStore.getState().items[0].quantity).toBe(2)
    expect(useCartStore.getState().subtotal).toBe(100_000)
  })

  it("sin stock conocido no limita (ítems guardados antes del cambio)", async () => {
    const { clampToStock } = await import("@/store/cart.store")
    expect(clampToStock(5)).toBe(5)
    expect(clampToStock(5, 3)).toBe(3)
  })
})
