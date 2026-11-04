import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockFindVariantsForQuickAdd } = vi.hoisted(() => ({ mockFindVariantsForQuickAdd: vi.fn() }))
vi.mock("@/server/repositories/product.repository", () => ({ searchProductsByName: vi.fn(), findProductBySlug: vi.fn() }))
vi.mock("@/server/repositories/variant.repository", () => ({ findVariantsForQuickAdd: mockFindVariantsForQuickAdd }))

import { getQuickAddVariantsAction } from "../product.actions"

describe("getQuickAddVariantsAction", () => {
  beforeEach(() => vi.clearAllMocks())

  it("ordena las tallas de menor a mayor", async () => {
    mockFindVariantsForQuickAdd.mockResolvedValue([
      { id: "v3", sku: "A_10", size: "10", color: "Negro" },
      { id: "v1", sku: "A_7", size: "7", color: "Negro" },
      { id: "v2", sku: "A_8.5", size: "8.5", color: "Negro" },
    ])
    const result = await getQuickAddVariantsAction("prod-1")
    expect(result.map((v) => v.size)).toEqual(["7", "8.5", "10"])
    expect(mockFindVariantsForQuickAdd).toHaveBeenCalledWith("prod-1")
  })

  it("no consulta con un id vacío o demasiado largo, y no rompe si falla la base", async () => {
    expect(await getQuickAddVariantsAction("")).toEqual([])
    expect(await getQuickAddVariantsAction("x".repeat(65))).toEqual([])
    expect(mockFindVariantsForQuickAdd).not.toHaveBeenCalled()
    mockFindVariantsForQuickAdd.mockRejectedValue(new Error("db"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await getQuickAddVariantsAction("prod-1")).toEqual([])
  })
})
