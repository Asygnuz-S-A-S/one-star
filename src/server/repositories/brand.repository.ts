import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export async function findManyBrands(where?: Prisma.BrandWhereInput) {
  return prisma.brand.findMany({
    where,
    orderBy: { name: "asc" },
  })
}

export async function findBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } })
}

/**
 * Marcas activas con al menos un producto publicado, con su conteo.
 * Alimenta el directorio público /marcas.
 */
export async function findActiveBrandsWithPublishedProducts() {
  return prisma.brand.findMany({
    where: { isActive: true, products: { some: { isPublished: true } } },
    include: { _count: { select: { products: { where: { isPublished: true } } } } },
    orderBy: { name: "asc" },
  })
}

export async function findBrandBySlug(slug: string) {
  return prisma.brand.findUnique({ where: { slug } })
}

export async function createBrandRecord(data: Prisma.BrandCreateInput) {
  return prisma.brand.create({ data })
}

export async function updateBrandRecord(id: string, data: Prisma.BrandUpdateInput) {
  return prisma.brand.update({ where: { id }, data })
}

export async function deleteBrandRecord(id: string) {
  return prisma.brand.delete({ where: { id } })
}
