import "server-only"
import { findPurchasableGiftCardVariants } from "../repositories/gift-card.repository"
import { isValidGiftCardAmount, type GiftCardOption } from "@/lib/gift-card"

/**
 * Montos de tarjeta de regalo que se pueden comprar ahora mismo, ordenados de
 * menor a mayor. Descarta las variantes sin stock o con un precio fuera del
 * rango permitido para no ofrecer una opción que el checkout va a rechazar.
 */
export async function getGiftCardOptions(): Promise<GiftCardOption[]> {
  const variants = await findPurchasableGiftCardVariants()

  return variants
    .flatMap((variant) => {
      const amount = variant.product.basePrice.toNumber()
      if (variant.stock <= 0 || !isValidGiftCardAmount(amount)) return []
      return [
        {
          variantId: variant.id,
          productId: variant.productId,
          sku: variant.sku,
          amount,
        },
      ]
    })
    .sort((a, b) => a.amount - b.amount)
}
