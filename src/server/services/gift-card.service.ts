import "server-only"

import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import {
  DEFAULT_GIFT_CARD_LIMITS,
  GIFT_CARD_AMOUNTS,
  GIFT_CARD_CATEGORY_SLUG,
  formatGiftCardAmount,
  giftCardSku,
  giftCardSlug,
  isGiftCardSku,
  isValidGiftCardAmount,
  type GiftCardOption,
} from "@/lib/gift-card"
import { giftCardExpiry, parseGiftCardAmounts } from "@/lib/storefront-copy"
import { findStoreSettingsReadOnly } from "@/server/repositories/store-settings.repository"
import { getGiftCardLimits } from "@/server/services/store-settings.service"
import { generateGiftCardCode } from "@/lib/gift-card-code"
import {
  findPurchasableGiftCardVariants,
  issueMissingGiftCardsForOrder,
  findGiftCardByCode,
  findRecentGiftCards,
  redeemGiftCardAmountRecord,
} from "../repositories/gift-card.repository"
import { sendGiftCardEmail } from "./email.service"
import type { OrderDTO } from "./order.service"

/**
 * Montos de tarjeta de regalo que se pueden comprar ahora mismo, ordenados de
 * menor a mayor. Descarta las variantes sin stock o con un precio fuera del
 * rango permitido para no ofrecer una opción que el checkout va a rechazar.
 */
const GIFT_CARD_STOCK = 9_999

/** Crea o publica los montos pedidos y oculta los que ya no están en la lista. */
export async function syncGiftCardCatalog(
  amounts: number[],
  limits: { minAmount: number; maxAmount: number },
): Promise<void> {
  const allowed = amounts.filter((amount) => isValidGiftCardAmount(amount, limits))
  if (allowed.length === 0) return
  const category = await prisma.category.upsert({
    where: { slug: GIFT_CARD_CATEGORY_SLUG },
    update: {},
    create: { name: "Tarjetas de regalo", slug: GIFT_CARD_CATEGORY_SLUG },
  })
  const keep = new Set(allowed)
  const current = await prisma.product.findMany({
    where: { slug: { startsWith: "tarjeta-regalo-" } },
    select: { id: true, basePrice: true },
  })
  for (const product of current) {
    if (!keep.has(product.basePrice.toNumber())) {
      await prisma.product.update({ where: { id: product.id }, data: { isPublished: false } })
    }
  }
  for (const amount of allowed) await upsertGiftCardProduct(amount, category.id)
}

/**
 * Producto + variante de la tarjeta de un monto: así el checkout la tasa desde la base de datos.
 * `publish: false` (montos que escribe el cliente): no aparece en catálogo, búsqueda ni sitemap,
 * y no despublica un monto del admin que ya exista.
 */
async function upsertGiftCardProduct(amount: number, categoryId: string, publish = true) {
  const product = await prisma.product.upsert({
    where: { slug: giftCardSlug(amount) },
    update: publish
      ? { basePrice: new Prisma.Decimal(amount), isPublished: true, availableOnline: true }
      : { availableOnline: true },
    create: {
      slug: giftCardSlug(amount),
      name: `Tarjeta de Regalo $${formatGiftCardAmount(amount)}`,
      description: "Tarjeta de regalo digital One Star. Se entrega por correo electrónico después de la compra.",
      basePrice: new Prisma.Decimal(amount),
      isOnSale: false,
      categoryId,
      availableOnline: true,
      availableInStores: false,
      isPublished: publish,
    },
  })
  const variant = await prisma.variant.upsert({
    where: { sku: giftCardSku(amount) },
    update: { stock: GIFT_CARD_STOCK, productId: product.id },
    create: { sku: giftCardSku(amount), size: "Digital", color: "Rojo One Star", stock: GIFT_CARD_STOCK, productId: product.id },
  })
  await prisma.inventoryLevel.deleteMany({ where: { variantId: variant.id } })
  await prisma.inventoryLevel.create({ data: { variantId: variant.id, storeLocationId: null, stock: GIFT_CARD_STOCK } })
  return { variantId: variant.id, productId: product.id, sku: variant.sku, amount }
}

/** Montos personalizados: múltiplos de mil, para que no se creen productos por cada peso. */
export const GIFT_CARD_CUSTOM_STEP = 1_000

/**
 * Tarjeta con el monto que escribe el cliente. Crea (o reutiliza) el producto oculto de ese
 * monto; el precio queda en la base de datos como cualquier otro, no viene del navegador.
 * Devuelve null si el monto está fuera de los límites del admin.
 */
export async function ensureCustomGiftCardOption(amount: number): Promise<GiftCardOption | null> {
  const limits = await getGiftCardLimits().catch(() => DEFAULT_GIFT_CARD_LIMITS)
  if (!isValidGiftCardAmount(amount, limits) || amount % GIFT_CARD_CUSTOM_STEP !== 0) return null
  const category = await prisma.category.upsert({
    where: { slug: GIFT_CARD_CATEGORY_SLUG },
    update: {},
    create: { name: "Tarjetas de regalo", slug: GIFT_CARD_CATEGORY_SLUG },
  })
  return upsertGiftCardProduct(amount, category.id, false)
}

export async function getGiftCardOptions(): Promise<GiftCardOption[]> {
  const [variants, limits, settings] = await Promise.all([
    findPurchasableGiftCardVariants(),
    getGiftCardLimits().catch(() => DEFAULT_GIFT_CARD_LIMITS),
    findStoreSettingsReadOnly().catch(() => null),
  ])
  // Los botones son solo los montos del admin (o los estándar si no configuró ninguno);
  // los personalizados que compraron otros clientes no se listan.
  const admin = parseGiftCardAmounts(settings?.giftCardAmounts)
  const configured = new Set<number>(admin.length ? admin : GIFT_CARD_AMOUNTS)

  return variants
    .flatMap((variant) => {
      const amount = variant.product.basePrice.toNumber()
      if (variant.stock <= 0 || !isValidGiftCardAmount(amount, limits)) return []
      if (!configured.has(amount)) return []
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

export interface IssuedGiftCard {
  code: string
  balance: number
}

/**
 * Emite una tarjeta de regalo por cada UNIDAD comprada (no una por línea de
 * pedido): dos tarjetas de $100.000 en el mismo pedido son dos códigos
 * distintos, porque cada una es un regalo para una persona distinta.
 */
export async function issueGiftCardsForOrder(order: OrderDTO): Promise<IssuedGiftCard[]> {
  const giftItems = (order.items ?? []).filter((i) => i.sku && isGiftCardSku(i.sku))
  if (giftItems.length === 0) return []

  const balances = giftItems.flatMap((item) =>
    Array.from({ length: item.quantity }, () => item.unitPrice)
  )
  const limits = await getGiftCardLimits().catch(() => DEFAULT_GIFT_CARD_LIMITS)
  // Idempotente: repetir la llamada para un pedido ya atendido no crea nada.
  return issueMissingGiftCardsForOrder(
    {
      orderId: order.id,
      customerEmail: order.customerEmail,
      balances,
      expiresAt: giftCardExpiry(new Date(), limits.validityMonths),
    },
    generateGiftCardCode
  )
}

/**
 * Efecto posterior al pago aprobado, mismo patrón fire-and-forget que
 * `runPostPaymentEffects` en payment.service: nunca debe hacer fallar ni
 * revertir el pago si la emisión o el correo fallan.
 */
export async function issueAndSendGiftCardsForOrder(order: OrderDTO): Promise<void> {
  const issued = await issueGiftCardsForOrder(order)
  if (issued.length === 0 || !order.customerEmail) return
  await sendGiftCardEmail({
    email: order.customerEmail,
    name: order.customerName ?? undefined,
    orderId: order.id,
    cards: issued,
  })
}

export interface GiftCardLookupResult {
  code: string
  balance: number
  isActive: boolean
  orderId: string | null
  createdAt: string
}

function toLookupResult(card: {
  code: string
  balance: { toNumber: () => number }
  isActive: boolean
  orderId: string | null
  createdAt: Date
}): GiftCardLookupResult {
  return {
    code: card.code,
    balance: card.balance.toNumber(),
    isActive: card.isActive,
    orderId: card.orderId,
    createdAt: card.createdAt.toISOString(),
  }
}

export interface RecentGiftCard {
  code: string
  balance: number
  isActive: boolean
  createdAt: string
}

export async function listRecentGiftCards(): Promise<RecentGiftCard[]> {
  const rows = await findRecentGiftCards()
  return rows.map((row) => ({
    code: row.code,
    balance: row.balance.toNumber(),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function searchGiftCard(code: string): Promise<GiftCardLookupResult | null> {
  const card = await findGiftCardByCode(code.trim().toUpperCase())
  return card ? toLookupResult(card) : null
}

export async function redeemGiftCard(code: string, amount: number): Promise<GiftCardLookupResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto a canjear debe ser mayor a cero.")
  }
  const normalized = code.trim().toUpperCase()
  const existing = await findGiftCardByCode(normalized)
  if (!existing) throw new Error("Código no encontrado.")
  if (!existing.isActive || existing.balance.toNumber() <= 0) {
    throw new Error("Esta tarjeta ya no tiene saldo disponible.")
  }
  if (existing.expiresAt && existing.expiresAt.getTime() <= Date.now()) {
    throw new Error("Esta tarjeta ya venció.")
  }
  if (amount > existing.balance.toNumber()) {
    throw new Error("El monto excede el saldo disponible.")
  }

  const updated = await redeemGiftCardAmountRecord(normalized, amount)
  if (!updated) throw new Error("El monto excede el saldo disponible.")
  return toLookupResult(updated)
}
