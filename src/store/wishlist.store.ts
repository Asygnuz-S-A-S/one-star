import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface WishlistState {
  productIds: string[]
  toggle: (productId: string) => void
  has: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],

      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [...state.productIds, productId],
        })),

      has: (productId) => get().productIds.includes(productId),
    }),
    {
      name: "onestar_wishlist",
      storage: createJSONStorage(() => localStorage),
      // Only persist the ids — the actions are recreated on load
      partialize: (state) => ({ productIds: state.productIds }),
    }
  )
)

// Convenience alias matching the cart store's naming pattern
export const useWishlist = useWishlistStore
