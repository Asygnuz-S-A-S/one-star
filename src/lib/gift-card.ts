/** Montos disponibles de tarjeta de regalo, en pesos colombianos. */
export const GIFT_CARD_AMOUNTS = [50_000, 100_000, 200_000, 300_000, 500_000] as const

export const GIFT_CARD_MIN_AMOUNT = 20_000
export const GIFT_CARD_MAX_AMOUNT = 2_000_000

/** Prefijo de SKU con el que se identifican las variantes de tarjeta de regalo. */
export const GIFT_CARD_SKU_PREFIX = "GIFT-CARD-"

/** Slug de la categoría que agrupa las tarjetas de regalo del catálogo. */
export const GIFT_CARD_CATEGORY_SLUG = "tarjetas-regalo"

export function giftCardSlug(amount: number): string {
  return `tarjeta-regalo-${amount}`
}

export function giftCardSku(amount: number): string {
  return `${GIFT_CARD_SKU_PREFIX}${amount}`
}

export function formatGiftCardAmount(amount: number): string {
  return new Intl.NumberFormat("es-CO").format(amount)
}

/**
 * Una tarjeta de regalo comprable. Cada monto es un producto real del catálogo
 * con su propia variante, porque el precio vive en `Product.basePrice` y no en
 * la variante: sin producto real el checkout no puede tasarla.
 */
export interface GiftCardOption {
  variantId: string
  productId: string
  sku: string
  amount: number
}

export function isValidGiftCardAmount(amount: number): boolean {
  return (
    Number.isInteger(amount) &&
    amount >= GIFT_CARD_MIN_AMOUNT &&
    amount <= GIFT_CARD_MAX_AMOUNT
  )
}

/**
 * Construye el ítem de carrito de una tarjeta de regalo. `id` es el id de la
 * variante real porque el checkout envía `variantId: item.id`.
 */
export function createGiftCardCartItem(option: GiftCardOption) {
  if (!isValidGiftCardAmount(option.amount)) {
    throw new Error("El monto de la tarjeta debe estar entre $20.000 y $2.000.000")
  }
  if (!option.variantId || !option.productId) {
    throw new Error("La tarjeta de regalo no está disponible en este momento.")
  }

  return {
    id: option.variantId,
    productId: option.productId,
    kind: "gift_card" as const,
    slug: giftCardSlug(option.amount),
    name: `Tarjeta de Regalo $${formatGiftCardAmount(option.amount)}`,
    brand: "One Star",
    imageUrl: "/logos/logopositivo.svg",
    size: "Digital",
    color: "Rojo One Star",
    price: option.amount,
    originalPrice: option.amount,
    quantity: 1,
    sku: option.sku,
  }
}

/**
 * Ítems de tarjeta de regalo guardados por versiones anteriores del carrito:
 * usaban un id ficticio (`gift-card-50000`) que el checkout no puede tasar.
 */
export function isLegacyGiftCardCartItemId(id: string): boolean {
  return id.startsWith("gift-card-")
}
