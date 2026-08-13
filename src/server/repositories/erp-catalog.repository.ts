import "server-only"

import { prisma } from "@/server/db/prisma"
import type { Gender } from "@prisma/client"

export async function findDefaultImportCategory() {
  return prisma.category.findUnique({ where: { slug: "sin-categoria" } })
}

export async function createDefaultImportCategory() {
  return prisma.category.create({
    data: {
      name: "Sin Categoría",
      slug: "sin-categoria",
      description: "Categoría por defecto para productos importados del ERP",
    },
  })
}

export async function findCatalogProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { variants: true },
  })
}

export async function findCatalogBrandByErpId(erpId: string) {
  return prisma.brand.findUnique({ where: { erpId } })
}

export async function findCatalogBrandBySlug(slug: string) {
  return prisma.brand.findUnique({ where: { slug } })
}

export async function updateCatalogBrandErpId(id: string, erpId: string) {
  return prisma.brand.update({ where: { id }, data: { erpId } })
}

export async function countCatalogBrandsBySlug(slug: string): Promise<number> {
  return prisma.brand.count({ where: { slug } })
}

export async function createCatalogBrand(data: {
  name: string
  slug: string
  erpId?: string
}) {
  return prisma.brand.create({ data })
}

export async function updateCatalogProduct(
  id: string,
  data: {
    basePrice: number
    unitOfMeasure?: string
    brandId: string | null
  }
) {
  return prisma.product.update({ where: { id }, data })
}

export async function createCatalogProduct(data: {
  name: string
  slug: string
  basePrice: number
  unitOfMeasure?: string
  categoryId: string
  brandId: string | null
  gender?: Gender
  erpId: string
}) {
  return prisma.product.create({
    data,
    include: { variants: true },
  })
}

/** Completa géneros vacíos por identidad ERP sin sobrescribir revisiones manuales. */
export async function fillMissingCatalogProductGenders(
  candidates: Array<{ erpId: string; gender: Gender }>
): Promise<number> {
  if (candidates.length === 0) return 0

  const results = await prisma.$transaction(
    candidates.map(({ erpId, gender }) =>
      prisma.product.updateMany({
        where: { erpId, gender: null },
        data: { gender },
      })
    )
  )

  return results.reduce((total, result) => total + result.count, 0)
}

export async function findMissingCatalogProductErpIds(
  erpIds: string[]
): Promise<string[]> {
  if (erpIds.length === 0) return []
  const products = await prisma.product.findMany({
    where: { erpId: { in: erpIds }, gender: null },
    select: { erpId: true },
  })
  return products.flatMap((product) => product.erpId ? [product.erpId] : [])
}

export async function updateCatalogVariant(
  id: string,
  data: {
    erpId: string
    stock: number
    size: string
    color?: string
  }
) {
  return prisma.variant.update({ where: { id }, data })
}

export async function createCatalogVariant(data: {
  productId: string
  sku: string
  erpId: string
  size: string
  color: string
  stock: number
}) {
  return prisma.variant.create({ data })
}
