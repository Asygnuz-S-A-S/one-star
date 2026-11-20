import "server-only"
import { prisma } from "../db/prisma"

/**
 * Productos que alimentan el feed de catálogo de Meta: publicados, habilitados
 * para venta online y con al menos una imagen (Meta rechaza items sin imagen).
 * Los agotados se incluyen marcados como `out of stock`: Meta prefiere verlos
 * declarados antes que desaparecidos del feed.
 */
export async function findMetaCatalogProducts(limit: number) {
  return prisma.product.findMany({
    where: {
      isPublished: true,
      availableOnline: true,
      images: { some: {} },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      basePrice: true,
      isOnSale: true,
      salePrice: true,
      gender: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: {
        select: { url: true },
        orderBy: { position: "asc" },
        take: 10,
      },
      variants: { select: { stock: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })
}

export type MetaCatalogProductRow = Awaited<ReturnType<typeof findMetaCatalogProducts>>[number]
