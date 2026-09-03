import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma, ProductColor } from "@prisma/client"

export async function findManyProductColors(onlyActive = false): Promise<ProductColor[]> {
  return prisma.productColor.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [{ position: "asc" }, { name: "asc" }],
  })
}

export async function findProductColorByName(name: string): Promise<ProductColor | null> {
  return prisma.productColor.findUnique({ where: { name } })
}

export async function createProductColorRecord(
  data: Prisma.ProductColorCreateInput
): Promise<ProductColor> {
  return prisma.productColor.create({ data })
}

export async function updateProductColorRecord(
  id: string,
  data: Prisma.ProductColorUpdateInput
): Promise<ProductColor> {
  return prisma.productColor.update({ where: { id }, data })
}

export async function deleteProductColorRecord(id: string): Promise<ProductColor> {
  return prisma.productColor.delete({ where: { id } })
}

/** Cuántas variantes usan un color (para avisar antes de eliminarlo). */
export async function countVariantsUsingColor(name: string): Promise<number> {
  return prisma.variant.count({ where: { color: { contains: name, mode: "insensitive" } } })
}

/** Mayor `position` actual, para agregar colores nuevos al final. */
export async function getMaxProductColorPosition(): Promise<number> {
  const last = await prisma.productColor.findFirst({ orderBy: { position: "desc" } })
  return last?.position ?? -1
}
