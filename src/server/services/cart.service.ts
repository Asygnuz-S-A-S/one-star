import "server-only"
import { findCartByUserId, clearCartByUserId } from "../repositories/cart.repository"

export interface CartItemDTO {
  id: string
  productId: string
  productName: string
  variantId: string
  size: string
  color: string
  quantity: number
  price: number
}

export interface CartDTO {
  id: string
  userId: string
  items: CartItemDTO[]
}

export async function getUserCart(userId: string): Promise<CartDTO | null> {
  const cart = await findCartByUserId(userId)
  if (!cart) return null

  return {
    id: cart.id,
    userId: cart.userId,
    items: cart.items.map(item => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      variantId: item.variantId,
      size: item.variant.size,
      color: item.variant.color,
      quantity: item.quantity,
      price: item.product.salePrice ? item.product.salePrice.toNumber() : item.product.basePrice.toNumber()
    }))
  }
}

export async function clearUserCart(userId: string): Promise<void> {
  await clearCartByUserId(userId)
}
