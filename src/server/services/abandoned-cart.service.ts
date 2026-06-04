import "server-only"
import {
  findManyAbandonedCarts,
  countAbandonedCarts,
  markAbandonedCartRecovered,
} from "../repositories/abandoned-cart.repository"

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
