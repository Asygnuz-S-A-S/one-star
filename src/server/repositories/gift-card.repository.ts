import "server-only"
import { prisma } from "../db/prisma"
import { GIFT_CARD_SKU_PREFIX } from "@/lib/gift-card"

/**
 * Variantes de tarjeta de regalo comprables. Se exigen las mismas condiciones
 * que `findVariantsForPricing` (publicado y disponible online): si la variante
 * no las cumple, el checkout la rechazaría después de añadirla al carrito.
 */
export async function findPurchasableGiftCardVariants() {
  return prisma.variant.findMany({
    where: {
      sku: { startsWith: GIFT_CARD_SKU_PREFIX },
      product: { isPublished: true, availableOnline: true },
    },
    select: {
      id: true,
      sku: true,
      stock: true,
      productId: true,
      product: { select: { basePrice: true } },
    },
  })
}
