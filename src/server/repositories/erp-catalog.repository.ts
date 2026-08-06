import "server-only"

import { prisma } from "@/server/db/prisma"

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
  erpId: string
}) {
  return prisma.product.create({
    data,
    include: { variants: true },
  })
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
