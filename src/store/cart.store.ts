import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export interface CartItem {
  id: string
  productId: string
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

function computeTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  }
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
          const items = existing
            ? state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + qty } : i
              )
            : [...state.items, { ...item, quantity: qty }]
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
                  i.id === variantId ? { ...i, quantity } : i
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
      // Only persist cart items — UI state (isOpen) resets on page load
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        subtotal: state.subtotal,
      }),
    }
  )
)

// Convenience hook with the same name the context used
export const useCart = useCartStore
