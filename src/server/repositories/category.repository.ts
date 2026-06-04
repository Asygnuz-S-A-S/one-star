import "server-only"
import { prisma } from "../db/prisma"
import type { Category } from "@prisma/client"

export async function findManyCategories(): Promise<Category[]> {
  return prisma.category.findMany({ orderBy: { name: "asc" } })
}

export async function findCategoryBySlug(slug: string): Promise<Category | null> {
  return prisma.category.findUnique({ where: { slug } })
}

export async function createCategory(data: { name: string; slug: string }): Promise<Category> {
  return prisma.category.create({ data })
}
