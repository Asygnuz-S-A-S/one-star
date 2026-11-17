import "server-only"
import { prisma } from "../db/prisma"
import type { Category } from "@prisma/client"

export async function findManyCategories(): Promise<Category[]> {
  return prisma.category.findMany({ orderBy: { name: "asc" } })
}

/** Categorías con al menos un producto publicado, sin la interna de importación. Para el filtro del catálogo. */
export async function findCategoriesWithPublishedProducts(excludeSlug: string, brandId?: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { slug: { not: excludeSlug }, products: { some: { isPublished: true, ...(brandId ? { brandId } : {}) } } },
    orderBy: { name: "asc" },
  })
}

export async function findCategoryBySlug(slug: string): Promise<Category | null> {
  return prisma.category.findUnique({ where: { slug } })
}

export async function createCategory(data: { name: string; slug: string }): Promise<Category> {
  return prisma.category.create({ data })
}

export async function updateCategory(id: string, data: { name: string; slug: string }): Promise<Category> {
  return prisma.category.update({ where: { id }, data })
}

export async function countProductsByCategoryId(id: string): Promise<number> {
  return prisma.product.count({ where: { categoryId: id } })
}

export async function deleteCategory(id: string): Promise<Category> {
  return prisma.category.delete({ where: { id } })
}
