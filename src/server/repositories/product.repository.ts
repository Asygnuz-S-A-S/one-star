import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

export const productInclude = {
  category: true,
  brand: true,
  images: { orderBy: { position: "asc" as const } },
  variants: {
    include: {
      inventory: {
        include: { storeLocation: true }
      }
    }
  },
} as const

export async function findManyProducts(
  where?: Prisma.ProductWhereInput,
  orderBy?: Prisma.ProductOrderByWithRelationInput,
  take?: number,
  skip?: number
) {
  return prisma.product.findMany({
    where,
    include: productInclude,
    take,
    skip,
    orderBy: orderBy ?? { createdAt: "desc" },
  })
}

export async function findProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug },
    include: {
      ...productInclude,
      crossSells: {
        include: {
          brand: { select: { id: true, name: true } },
          images: { take: 1, orderBy: { position: "asc" } },
          variants: true,
        },
      },
    },
  })
}

export async function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: productInclude })
}

export async function findProductByIdForAdmin(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { position: "asc" } },
      variants: { 
        orderBy: { sku: "asc" },
        include: {
          inventory: {
            include: { storeLocation: true }
          }
        }
      },
      crossSells: {
        include: {
          brand: { select: { id: true, name: true } },
          images: { take: 1, orderBy: { position: "asc" } },
          variants: { 
            include: {
              inventory: { include: { storeLocation: true } }
            }
          },
        },
      },
    },
  })
}

export async function countProducts(
  where?: Prisma.ProductWhereInput
): Promise<number> {
  return prisma.product.count({ where })
}

export async function fetchBrands(): Promise<string[]> {
  const brands = await prisma.brand.findMany({
    select: { name: true },
    where: { isActive: true },
    orderBy: { name: "asc" }
  })
  return brands.map((b) => b.name)
}

export async function createProductRecord(data: Prisma.ProductCreateInput) {
  return prisma.product.create({ data, include: productInclude })
}

export async function updateProductRecord(
  id: string,
  data: Prisma.ProductUpdateInput
) {
  return prisma.product.update({ where: { id }, data, include: productInclude })
}

export async function deleteProductRecord(id: string): Promise<void> {
  await prisma.product.delete({ where: { id } })
}

export async function deleteVariantsByProduct(productId: string) {
  return prisma.variant.deleteMany({ where: { productId } })
}

export async function deleteImagesByProduct(productId: string) {
  return prisma.productImage.deleteMany({ where: { productId } })
}

export async function searchProductsByName(
  q: string,
  excludeId?: string,
  take = 8
): Promise<{
  id: string
  name: string
  slug: string
  basePrice: { toNumber: () => number }
  brandId: string | null
  brand: { name: string } | null
  images: { url: string }[]
}[]> {
  return prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: q, mode: "insensitive" } },
        excludeId ? { id: { not: excludeId } } : {},
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      brandId: true,
      brand: { select: { name: true } },
      images: { select: { url: true }, orderBy: { position: "asc" }, take: 2 },
    },
    take,
  })
}

export async function runInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn)
}
