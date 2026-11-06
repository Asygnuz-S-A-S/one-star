import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { isLegacyGiftCardCartItemId } from "@/lib/gift-card"

export interface CartItem {
  id: string
  productId: string
  kind?: "product" | "gift_card"
  slug: string
  name: string
  brand: string | null
  imageUrl: string | null
  size: string
  color: string
  price: number
  originalPrice: number
  quantity: number
  sku: string
  /** Unidades disponibles al agregarla; la bolsa no deja pasar de aquí. El servidor revalida al pagar. */
  maxQuantity?: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  totalItems: number
  subtotal: number
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
}

/** Cantidad dentro del stock conocido de la variante (sin tope si no se conoce). */
export function clampToStock(quantity: number, maxQuantity?: number): number {
  return typeof maxQuantity === "number" ? Math.min(quantity, Math.max(0, maxQuantity)) : quantity
}

function computeTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  }
}

/**
 * v1: las tarjetas de regalo guardadas antes de existir en el catálogo llevaban
 * un id ficticio que el checkout no puede tasar. Se descartan del carrito
 * persistido en lugar de dejar que el pedido falle al pagar.
 */
export const CART_STORAGE_VERSION = 1

type PersistedCart = Pick<CartState, "items" | "totalItems" | "subtotal">

export function migratePersistedCart(
  persisted: unknown,
  version: number
): PersistedCart {
  const state = (persisted ?? {}) as Partial<PersistedCart>
  const items = Array.isArray(state.items) ? state.items : []

  if (version >= CART_STORAGE_VERSION) {
    return { items, ...computeTotals(items) }
  }

  const cleaned = items.filter((item) => !isLegacyGiftCardCartItemId(item.id))
  return { items: cleaned, ...computeTotals(cleaned) }
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      totalItems: 0,
      subtotal: 0,

      addItem: (item) =>
        set((state) => {
          const qty = item.quantity ?? 1
          const existing = state.items.find((i) => i.id === item.id)
          const maxQuantity = item.maxQuantity ?? existing?.maxQuantity
          const items = existing
            ? state.items.map((i) =>
                i.id === item.id
                  ? { ...i, maxQuantity, quantity: clampToStock(i.quantity + qty, maxQuantity) }
                  : i
              )
            : [...state.items, { ...item, quantity: clampToStock(qty, maxQuantity) }]
          return { items, ...computeTotals(items) }
        }),

      removeItem: (variantId) =>
        set((state) => {
          const items = state.items.filter((i) => i.id !== variantId)
          return { items, ...computeTotals(items) }
        }),

      updateQuantity: (variantId, quantity) =>
        set((state) => {
          const items =
            quantity <= 0
              ? state.items.filter((i) => i.id !== variantId)
              : state.items.map((i) =>
                  i.id === variantId ? { ...i, quantity: clampToStock(quantity, i.maxQuantity) } : i
                )
          return { items, ...computeTotals(items) }
        }),

      clearCart: () => set({ items: [], totalItems: 0, subtotal: 0 }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: "onestar_cart",
      storage: createJSONStorage(() => localStorage),
      version: CART_STORAGE_VERSION,
      // Only persist cart items — UI state (isOpen) resets on page load
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        subtotal: state.subtotal,
      }),
      migrate: migratePersistedCart,
    }
  )
)

// Convenience hook with the same name the context used
export const useCart = useCartStore
