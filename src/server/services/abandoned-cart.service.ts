import "server-only"
import {
  findManyAbandonedCarts,
  countAbandonedCarts,
  markAbandonedCartRecovered,
  findOpenAbandonedCartByEmail,
  createAbandonedCartRecord,
  updateAbandonedCartData,
  markAbandonedCartsRecoveredByEmail,
} from "../repositories/abandoned-cart.repository"
import type { Prisma } from "@prisma/client"

export interface AbandonedCartDTO {
  id: string
  email: string
  createdAt: string
  recoveredAt: string | null
  cartData: unknown
}

export async function getAbandonedCarts(
  page: number,
  pageSize: number
): Promise<{ carts: AbandonedCartDTO[]; total: number }> {
  const [rows, total] = await Promise.all([
    findManyAbandonedCarts(pageSize, (page - 1) * pageSize),
    countAbandonedCarts(),
  ])

  const carts: AbandonedCartDTO[] = rows.map((c) => ({
    id: c.id,
    email: c.email,
    createdAt: c.createdAt.toISOString(),
    recoveredAt: c.recoveredAt?.toISOString() ?? null,
    cartData: c.cartData,
  }))

  return { carts, total }
}

export async function recoverAbandonedCart(id: string): Promise<void> {
  await markAbandonedCartRecovered(id)
}

/**
 * Captura (o refresca) el carrito de un visitante que inició checkout.
 * Si el email ya tiene un carrito abierto se actualiza su contenido en vez
 * de crear duplicados; queda "abandonado" hasta que la compra se complete.
 */
export async function captureAbandonedCart(
  email: string,
  cartData: unknown,
  userId?: string | null
): Promise<void> {
  const existing = await findOpenAbandonedCartByEmail(email)
  if (existing) {
    await updateAbandonedCartData(existing.id, cartData as Prisma.InputJsonValue)
    return
  }
  await createAbandonedCartRecord({
    email,
    cartData: cartData as Prisma.InputJsonValue,
    userId,
  })
}

/** Cierra los carritos abiertos de un email cuando su compra se concreta. */
export async function markCartsRecoveredForEmail(email: string): Promise<void> {
  await markAbandonedCartsRecoveredByEmail(email)
}
