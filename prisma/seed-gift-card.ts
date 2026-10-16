import { Prisma, PrismaClient } from "@prisma/client"
import {
  GIFT_CARD_AMOUNTS,
  GIFT_CARD_CATEGORY_SLUG,
  formatGiftCardAmount,
  giftCardSku,
  giftCardSlug,
} from "../src/lib/gift-card"

/** Inventario nominal: una tarjeta digital no se agota. */
const GIFT_CARD_STOCK = 9_999

/**
 * Cada monto de tarjeta de regalo es un producto independiente porque el precio
 * vive en `Product.basePrice`, no en la variante. Sin estos productos el ítem
 * de tarjeta llega al carrito pero el checkout no puede tasarlo.
 */
export async function seedGiftCardProducts(prisma: PrismaClient): Promise<number> {
  const category = await prisma.category.upsert({
    where: { slug: GIFT_CARD_CATEGORY_SLUG },
    update: {},
    create: { name: "Tarjetas de regalo", slug: GIFT_CARD_CATEGORY_SLUG },
  })

  for (const amount of GIFT_CARD_AMOUNTS) {
    const product = await prisma.product.upsert({
      where: { slug: giftCardSlug(amount) },
      update: {
        basePrice: new Prisma.Decimal(amount),
        isPublished: true,
        availableOnline: true,
        availableInStores: false,
      },
      create: {
        slug: giftCardSlug(amount),
        name: `Tarjeta de Regalo $${formatGiftCardAmount(amount)}`,
        description:
          "Tarjeta de regalo digital One Star. Se entrega por correo electrónico después de la compra.",
        basePrice: new Prisma.Decimal(amount),
        isOnSale: false,
        categoryId: category.id,
        availableOnline: true,
        availableInStores: false,
        isPublished: true,
      },
    })

    const variant = await prisma.variant.upsert({
      where: { sku: giftCardSku(amount) },
      update: { stock: GIFT_CARD_STOCK, productId: product.id },
      create: {
        sku: giftCardSku(amount),
        size: "Digital",
        color: "Rojo One Star",
        stock: GIFT_CARD_STOCK,
        productId: product.id,
      },
    })

    // Bodega web (storeLocationId null): mantiene coherente el inventario que
    // muestra el administrador con el stock que valida el checkout. Se borra y
    // se recrea porque `@@unique([variantId, storeLocationId])` no protege
    // contra duplicados cuando la tienda es NULL — mismo criterio que seed-demo.
    await prisma.inventoryLevel.deleteMany({ where: { variantId: variant.id } })
    await prisma.inventoryLevel.create({
      data: { variantId: variant.id, storeLocationId: null, stock: GIFT_CARD_STOCK },
    })
  }

  return GIFT_CARD_AMOUNTS.length
}
