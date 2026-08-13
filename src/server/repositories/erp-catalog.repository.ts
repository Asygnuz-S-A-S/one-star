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

export async function ensureCatalogCategory(data: { slug: string; name: string }) {
  return prisma.category.upsert({
    where: { slug: data.slug },
    update: {},
    create: {
      ...data,
      description: `Categoría sugerida automáticamente desde el catálogo ERP: ${data.name}`,
    },
  })
}

export async function ensureCatalogBrand(data: { slug: string; name: string }) {
  return prisma.brand.upsert({
    where: { slug: data.slug },
    update: {},
    create: data,
  })
}

export async function findCatalogProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: { variants: true },
  })
}

export async function findProvisionalCatalogProductBrands(erpIds: string[]): Promise<
  Array<{ erpId: string; brandErpId: string; brandName: string }>
> {
  if (erpIds.length === 0) return []
  const products = await prisma.product.findMany({
    where: {
      erpId: { in: erpIds },
      brand: {
        erpId: { not: null },
        name: { startsWith: "Por nombrar (" },
      },
    },
    select: {
      erpId: true,
      brand: { select: { erpId: true, name: true } },
    },
  })
  return products.flatMap((product) =>
    product.erpId && product.brand?.erpId
      ? [{
          erpId: product.erpId,
          brandErpId: product.brand.erpId,
          brandName: product.brand.name,
        }]
      : []
  )
}

export async function replaceProvisionalCatalogProductBrands(
  candidates: Array<{
    erpId: string
    sourceBrandErpId: string
    targetBrandId: string
  }>
): Promise<{ updatedCount: number; deletedProvisionalBrandCount: number }> {
  if (candidates.length === 0) {
    return { updatedCount: 0, deletedProvisionalBrandCount: 0 }
  }
  const sourceBrandErpIds = [...new Set(
    candidates.map((candidate) => candidate.sourceBrandErpId)
  )]
  const results = await prisma.$transaction([
    ...candidates.map((candidate) =>
      prisma.product.updateMany({
        where: {
          erpId: candidate.erpId,
          brand: {
            erpId: candidate.sourceBrandErpId,
            name: `Por nombrar (${candidate.sourceBrandErpId})`,
          },
        },
        data: { brandId: candidate.targetBrandId },
      })
    ),
    prisma.brand.deleteMany({
      where: {
        OR: sourceBrandErpIds.map((erpId) => ({
          erpId,
          name: `Por nombrar (${erpId})`,
          products: { none: {} },
        })),
      },
    }),
  ])
  const deletion = results.at(-1)!
  return {
    updatedCount: results
      .slice(0, -1)
      .reduce((total, result) => total + result.count, 0),
    deletedProvisionalBrandCount: deletion.count,
  }
}

export async function updateCatalogProduct(
  id: string,
  data: {
    basePrice: number
    unitOfMeasure?: string
    brandId?: string | null
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

/** Mueve únicamente productos que aún conservan la categoría de importación. */
export async function fillDefaultCatalogProductCategories(
  candidates: Array<{ erpId: string; categoryId: string }>,
  defaultCategoryId: string
): Promise<number> {
  if (candidates.length === 0) return 0
  const results = await prisma.$transaction(
    candidates.map(({ erpId, categoryId }) =>
      prisma.product.updateMany({
        where: { erpId, categoryId: defaultCategoryId },
        data: { categoryId },
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

export async function findDefaultCatalogProductErpIds(
  erpIds: string[],
  defaultCategoryId: string
): Promise<string[]> {
  if (erpIds.length === 0) return []
  const products = await prisma.product.findMany({
    where: { erpId: { in: erpIds }, categoryId: defaultCategoryId },
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
