import "server-only"
import { findManyCategories, findCategoryBySlug } from "../repositories/category.repository"
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
