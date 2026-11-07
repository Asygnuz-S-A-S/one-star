import { describe, expect, it } from "vitest"
import { addRecentlyViewed, RECENTLY_VIEWED_MAX, type RecentlyViewedItem } from "../recently-viewed.store"

const item = (id: string): RecentlyViewedItem => ({ id, slug: id, name: `Tenis ${id}`, price: 100_000 })

describe("addRecentlyViewed", () => {
  it("pone el último visto de primero sin repetirlo", () => {
    expect(addRecentlyViewed([item("a"), item("b")], item("b")).map((i) => i.id)).toEqual(["b", "a"])
  })

  it("conserva solo los más recientes", () => {
    const many = Array.from({ length: RECENTLY_VIEWED_MAX }, (_, i) => item(String(i)))
    const next = addRecentlyViewed(many, item("nuevo"))
    expect(next).toHaveLength(RECENTLY_VIEWED_MAX)
    expect(next[0].id).toBe("nuevo")
    expect(next.at(-1)?.id).toBe(String(RECENTLY_VIEWED_MAX - 2))
  })
})
