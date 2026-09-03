import "server-only"
import { prisma } from "../db/prisma"

export async function findCartByUserId(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        where: {
          product: { isPublished: true, availableOnline: true },
        },
        include: {
          product: true,
          variant: true
        }
      }
    }
  })
}

export async function clearCartByUserId(userId: string) {
  const cart = await prisma.cart.findUnique({ where: { userId } })
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }
}
