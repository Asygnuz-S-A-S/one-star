import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseAdminProductFilters } from "../product.validator"

describe("parseAdminProductFilters", () => {
  it("normaliza la página e ignora estados de publicación y stock inválidos", () => {
    expect(parseAdminProductFilters({
      page: "0",
      q: "  tenis  ",
      category: "category-invalida",
      brand: "brand-invalida",
      status: "archived",
      hasStock: "maybe",
    })).toEqual({
      page: 1,
      q: "tenis",
      categoryId: undefined,
      brandId: undefined,
      status: undefined,
      hasStock: undefined,
    })
  })

  it("conserva IDs CUID válidos para categoría y marca", () => {
    expect(parseAdminProductFilters({
      category: "c000000000000000000000001",
      brand: "c000000000000000000000002",
    })).toMatchObject({
      categoryId: "c000000000000000000000001",
      brandId: "c000000000000000000000002",
    })
  })
})

describe("productFormSchema: precio de oferta", () => {
  const base = { name: "Tenis", categoryId: "cat-1", basePrice: 300000, isOnSale: true }

  it("acepta una oferta menor que el precio normal", async () => {
    const { productFormSchema } = await import("../product.validator")
    expect(productFormSchema.safeParse({ ...base, salePrice: 250000 }).success).toBe(true)
  })

  it("rechaza una oferta igual o mayor que el precio normal", async () => {
    const { productFormSchema } = await import("../product.validator")
    const result = productFormSchema.safeParse({ ...base, salePrice: 300000 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("El precio de oferta debe ser menor que el precio normal.")
  })
})
