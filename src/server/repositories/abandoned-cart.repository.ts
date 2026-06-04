import "server-only"
import { prisma } from "../db/prisma"

export async function findManyAbandonedCarts(take: number, skip: number) {
  return prisma.abandonedCart.findMany({
    orderBy: { createdAt: "desc" },
    take,
    skip,
  })
}

export async function countAbandonedCarts(): Promise<number> {
  return prisma.abandonedCart.count()
}

export async function markAbandonedCartRecovered(id: string) {
  return prisma.abandonedCart.update({
    where: { id },
    data: { recoveredAt: new Date() },
  })
}
