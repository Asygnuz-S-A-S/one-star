export const GIFT_CARD_AMOUNTS = [50_000, 100_000, 200_000, 300_000, 500_000] as const

export const GIFT_CARD_MIN_AMOUNT = 20_000
export const GIFT_CARD_MAX_AMOUNT = 2_000_000

export function createGiftCardCartItem(amount: number) {
  if (
    !Number.isInteger(amount) ||
    amount < GIFT_CARD_MIN_AMOUNT ||
    amount > GIFT_CARD_MAX_AMOUNT
  ) {
    throw new Error("El monto de la tarjeta debe estar entre $20.000 y $2.000.000")
  }

  const formattedAmount = new Intl.NumberFormat("es-CO").format(amount)

  return {
    id: `gift-card-${amount}`,
    productId: `gift-card-${amount}`,
    kind: "gift_card" as const,
    slug: "tarjeta-regalo",
    name: `Tarjeta de Regalo $${formattedAmount}`,
    brand: "One Star",
    imageUrl: "/logos/logopositivo.svg",
    size: "Digital",
    color: "Rojo One Star",
    price: amount,
    originalPrice: amount,
    quantity: 1,
    sku: `GIFT-CARD-${amount}`,
  }
}
