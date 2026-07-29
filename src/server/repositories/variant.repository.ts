import "server-only"
import { prisma } from "../db/prisma"
import { isRealColor } from "@/lib/colors"
import type { Variant } from "@prisma/client"

export async function findManyVariants(): Promise<Variant[]> {
  return prisma.variant.findMany()
}

export async function getUniqueSizes(): Promise<string[]> {
  const variants = await prisma.variant.findMany({
    select: { size: true },
    distinct: ["size"],
  })
  return variants.map(v => v.size).filter(Boolean)
}

/**
 * Colores distintos disponibles para filtrar en la tienda.
 * Descarta los marcadores sin color real ("N/A", vacío) que deja la
 * sincronización del ERP cuando la variante aún no tiene color asignado.
 */
export async function getUniqueColors(): Promise<string[]> {
  const variants = await prisma.variant.findMany({
    select: { color: true },
    distinct: ["color"],
    orderBy: { color: "asc" },
  })
  return variants.map((v) => v.color).filter(isRealColor)
}

export async function countVariants(): Promise<number> {
  return prisma.variant.count()
}

/**
 * Variantes con los datos de precio de su producto.
 * Usado por el checkout para recalcular precios en el servidor:
 * los precios enviados por el cliente nunca se persisten.
 */
export async function findVariantsForPricing(variantIds: string[]) {
  return prisma.variant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      sku: true,
      stock: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
          basePrice: true,
          isOnSale: true,
          salePrice: true,
        },
      },
    },
  })
}
