import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

/** Lo mínimo para pintar la tarjeta sin pedirle nada al servidor. El precio es el del momento en que se vio. */
export interface RecentlyViewedItem {
  id: string
  slug: string
  name: string
  brand?: string | null
  imageUrl?: string | null
  price: number
}

export const RECENTLY_VIEWED_MAX = 12

interface RecentlyViewedState {
  items: RecentlyViewedItem[]
  record: (item: RecentlyViewedItem) => void
}

/** Pone el producto de primero, sin repetirlo y conservando solo los más recientes. */
export function addRecentlyViewed(items: RecentlyViewedItem[], item: RecentlyViewedItem, max = RECENTLY_VIEWED_MAX): RecentlyViewedItem[] {
  return [item, ...items.filter((existing) => existing.id !== item.id)].slice(0, max)
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      record: (item) => set((state) => ({ items: addRecentlyViewed(state.items, item) })),
    }),
    {
      name: "onestar_recently_viewed",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
)
