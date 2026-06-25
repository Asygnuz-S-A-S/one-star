import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/category.repository", () => ({
  findManyCategories: vi.fn(),
  findCategoryBySlug: vi.fn(),
}))

import { getCategories, getCategoryBySlug } from "../category.service"
import { findManyCategories, findCategoryBySlug } from "@/server/repositories/category.repository"

const mockFindMany = vi.mocked(findManyCategories)
const mockFindBySlug = vi.mocked(findCategoryBySlug)

const rawCategory = {
  id: "cat-1",
  name: "Zapatillas",
  slug: "zapatillas",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
}

describe("getCategories", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna la lista de categorías mapeadas a DTO", async () => {
    mockFindMany.mockResolvedValue([rawCategory])
    const result = await getCategories()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ id: "cat-1", name: "Zapatillas", slug: "zapatillas" })
  })

  it("retorna arreglo vacío cuando no hay categorías", async () => {
    mockFindMany.mockResolvedValue([])
    const result = await getCategories()
    expect(result).toEqual([])
  })

  it("el DTO solo expone id, name y slug (sin fechas internas)", async () => {
    mockFindMany.mockResolvedValue([rawCategory])
    const result = await getCategories()
    expect(result[0]).not.toHaveProperty("createdAt")
    expect(result[0]).not.toHaveProperty("updatedAt")
  })
})

describe("getCategoryBySlug", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna el DTO cuando la categoría existe", async () => {
    mockFindBySlug.mockResolvedValue(rawCategory)
    const result = await getCategoryBySlug("zapatillas")
    expect(result).not.toBeNull()
    expect(result!.slug).toBe("zapatillas")
  })

  it("retorna null cuando el slug no existe", async () => {
    mockFindBySlug.mockResolvedValue(null)
    const result = await getCategoryBySlug("no-existe")
    expect(result).toBeNull()
  })
})
