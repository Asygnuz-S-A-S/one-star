import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/category.repository", () => ({
  findManyCategories: vi.fn(),
  findCategoryBySlug: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  countProductsByCategoryId: vi.fn(),
  deleteCategory: vi.fn(),
}))

import {
  createCategoryFromAdmin,
  deleteCategoryFromAdmin,
  getCategories,
  getCategoryBySlug,
  updateCategoryFromAdmin,
} from "../category.service"
import {
  countProductsByCategoryId,
  createCategory,
  deleteCategory,
  findManyCategories,
  findCategoryBySlug,
  updateCategory,
} from "@/server/repositories/category.repository"

const mockFindMany = vi.mocked(findManyCategories)
const mockFindBySlug = vi.mocked(findCategoryBySlug)
const mockCreate = vi.mocked(createCategory)
const mockUpdate = vi.mocked(updateCategory)
const mockCountProducts = vi.mocked(countProductsByCategoryId)
const mockDelete = vi.mocked(deleteCategory)

const rawCategory = {
  id: "cat-1", name: "Zapatillas", slug: "zapatillas", description: null,
  imageUrl: null, createdAt: new Date("2024-01-01"), updatedAt: new Date("2024-01-01"),
}

beforeEach(() => vi.clearAllMocks())

describe("getCategories", () => {
  it("retorna la lista de categorías mapeadas a DTO", async () => {
    mockFindMany.mockResolvedValue([rawCategory])
    await expect(getCategories()).resolves.toEqual([{ id: "cat-1", name: "Zapatillas", slug: "zapatillas" }])
  })

  it("retorna arreglo vacío cuando no hay categorías", async () => {
    mockFindMany.mockResolvedValue([])
    await expect(getCategories()).resolves.toEqual([])
  })
})

describe("getCategoryBySlug", () => {
  it("retorna null cuando el slug no existe", async () => {
    mockFindBySlug.mockResolvedValue(null)
    await expect(getCategoryBySlug("no-existe")).resolves.toBeNull()
  })
})

describe("mutaciones de categoría", () => {
  it("crea solo si el slug no existe", async () => {
    mockFindBySlug.mockResolvedValue(null)
    mockCreate.mockResolvedValue(rawCategory)

    await expect(createCategoryFromAdmin({ name: "Zapatillas", slug: "zapatillas" })).resolves.toEqual({ success: true })
    expect(mockCreate).toHaveBeenCalledWith({ name: "Zapatillas", slug: "zapatillas" })
  })

  it("impide que una actualización robe el slug de otra categoría", async () => {
    mockFindBySlug.mockResolvedValue({ ...rawCategory, id: "cat-2" })

    await expect(updateCategoryFromAdmin("cat-1", { name: "Nuevo", slug: "zapatillas" })).resolves.toEqual({
      success: false,
      error: "El slug ya está en uso por otra categoría",
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it("no borra una categoría con productos", async () => {
    mockCountProducts.mockResolvedValue(2)

    await expect(deleteCategoryFromAdmin("cat-1")).resolves.toEqual({
      success: false,
      error: "No se puede eliminar porque tiene 2 productos asignados.",
    })
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
