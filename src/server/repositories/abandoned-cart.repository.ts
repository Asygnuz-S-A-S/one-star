import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

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

/** Último carrito abandonado sin recuperar para un email dado. */
export async function findOpenAbandonedCartByEmail(email: string) {
  return prisma.abandonedCart.findFirst({
    where: { email, recoveredAt: null },
    orderBy: { createdAt: "desc" },
  })
}

export async function createAbandonedCartRecord(data: {
  email: string
  cartData: Prisma.InputJsonValue
  userId?: string | null
}) {
  return prisma.abandonedCart.create({
    data: {
      email: data.email,
      cartData: data.cartData,
      userId: data.userId ?? null,
    },
  })
}

export async function updateAbandonedCartData(id: string, cartData: Prisma.InputJsonValue) {
  return prisma.abandonedCart.update({
    where: { id },
    data: { cartData },
  })
}

/** Marca como recuperados todos los carritos abiertos de un email (post-compra). */
export async function markAbandonedCartsRecoveredByEmail(email: string) {
  return prisma.abandonedCart.updateMany({
    where: { email, recoveredAt: null },
    data: { recoveredAt: new Date() },
  })
}
