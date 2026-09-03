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
