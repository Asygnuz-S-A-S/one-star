import "server-only"
import {
  countProductsByCategoryId,
  createCategory,
  deleteCategory,
  findManyCategories,
  findCategoryBySlug,
  updateCategory,
} from "../repositories/category.repository"
import type { Category } from "@prisma/client"

export interface CategoryDTO {
  id: string
  name: string
  slug: string
}

export function mapCategoryToDTO(category: Category): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  }
}

export async function getCategories(): Promise<CategoryDTO[]> {
  const categories = await findManyCategories()
  return categories.map(mapCategoryToDTO)
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
  const category = await findCategoryBySlug(slug)
  return category ? mapCategoryToDTO(category) : null
}

export async function createCategoryFromAdmin(input: { name: string; slug: string }) {
  const existing = await findCategoryBySlug(input.slug)
  if (existing) return { success: false as const, error: "El slug ya existe" }

  await createCategory(input)
  return { success: true as const }
}

export async function updateCategoryFromAdmin(id: string, input: { name: string; slug: string }) {
  const existing = await findCategoryBySlug(input.slug)
  if (existing && existing.id !== id) {
    return { success: false as const, error: "El slug ya está en uso por otra categoría" }
  }

  await updateCategory(id, input)
  return { success: true as const }
}

export async function deleteCategoryFromAdmin(id: string) {
  const productsCount = await countProductsByCategoryId(id)
  if (productsCount > 0) {
    return {
      success: false as const,
      error: `No se puede eliminar porque tiene ${productsCount} productos asignados.`,
    }
  }

  await deleteCategory(id)
  return { success: true as const }
}
