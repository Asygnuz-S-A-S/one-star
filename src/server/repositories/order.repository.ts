import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma, OrderStatus, PaymentStatus, ShippingCarrier } from "@prisma/client"

export async function createOrder(data: Prisma.OrderCreateInput) {
  return prisma.order.create({
    data,
    include: { items: true },
  })
}

/** Lanzado cuando otra compra se llevó las últimas unidades mientras se creaba el pedido. */
export class StockReservationError extends Error {
  constructor(public readonly variantId: string) {
    super(`Stock insuficiente para reservar la variante ${variantId}.`)
    this.name = "StockReservationError"
  }
}

/**
 * Crea el pedido y aparta sus unidades en la misma transacción: el stock baja
 * ya, mientras el cliente paga. El decremento es condicional (stock >= cantidad)
 * sobre la fila bloqueada, así dos compras de la última unidad no pasan ambas.
 */
export async function createOrderReservingStock(
  data: Prisma.OrderCreateInput,
  items: { variantId: string; quantity: number }[],
  reservedUntil: Date
) {
  return prisma.$transaction(async (tx) => {
    for (const item of items) {
      const reserved = await tx.variant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (reserved.count === 0) throw new StockReservationError(item.variantId)
    }
    return tx.order.create({
      data: { ...data, stockReserved: items.length > 0, stockReservedUntil: items.length > 0 ? reservedUntil : null },
      include: { items: true },
    })
  })
}

/**
 * Devuelve a la venta las unidades apartadas por un pedido sin pago. El flag
 * se apaga con un UPDATE condicional: si el pago o otra liberación ya lo
 * consumió, no se suma nada (nunca se devuelve dos veces).
 */
async function releaseReservedStock(tx: Prisma.TransactionClient, orderId: string): Promise<boolean> {
  const released = await tx.order.updateMany({
    where: { id: orderId, stockReserved: true, paymentStatus: { not: "APPROVED" } },
    data: { stockReserved: false },
  })
  if (released.count === 0) return false
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true } })
  for (const item of items) {
    if (!item.variantId) continue
    await tx.variant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } })
  }
  return true
}

/**
 * Pedidos que apartaron stock y nadie empezó a pagar (sin referencia de la
 * pasarela) antes de que venciera la reserva. Con una referencia, el pago
 * está en curso (PSE o efectivo pendiente) y la reserva se mantiene hasta que
 * la pasarela lo apruebe o lo rechace.
 */
export async function releaseExpiredStockReservations(now: Date): Promise<string[]> {
  const expired = await prisma.order.findMany({
    where: {
      stockReserved: true,
      stockReservedUntil: { lt: now },
      paymentStatus: "PENDING",
      paymentReference: null,
    },
    select: { id: true },
  })
  const released: string[] = []
  for (const { id } of expired) {
    if (await prisma.$transaction((tx) => releaseReservedStock(tx, id))) released.push(id)
  }
  return released
}

export async function findOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, variant: true } },
      user: true,
    },
  })
}

export async function findManyOrders(
  take?: number,
  skip?: number,
  where?: Prisma.OrderWhereInput
) {
  return prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: {
      items: { include: { product: true, variant: true } },
      user: true,
    },
  })
}

export async function findOrdersByUserId(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: { select: { url: true, alt: true }, take: 1 },
            },
          },
        },
      },
    },
  })
}

export async function countOrders(where?: Prisma.OrderWhereInput): Promise<number> {
  return prisma.order.count({ where })
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return prisma.order.update({ where: { id }, data: { status } })
}

export async function updateOrderStatusAndTracking(
  id: string,
  status: string,
  trackingNumber?: string,
  carrier?: ShippingCarrier | null
) {
  return prisma.order.update({
    where: { id },
    data: {
      status: status as OrderStatus,
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      ...(carrier !== undefined ? { carrier } : {}),
    },
  })
}

/**
 * Registra el desenlace de un pago que NO fue aprobado (rechazo, fallo,
 * vencimiento o cancelación manual de un pedido sin pagar). Solo afecta
 * pedidos cuyo pago sigue sin confirmar: un pedido ya APPROVED nunca se
 * degrada por esta vía. Devuelve `true` si la fila cambió.
 */
export async function closeUnpaidOrder(
  id: string,
  paymentStatus: Exclude<PaymentStatus, "APPROVED">
): Promise<boolean> {
  // Cerrar y devolver las unidades apartadas van juntos: o pasan ambos o ninguno.
  return prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id, paymentStatus: { not: "APPROVED" }, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED", paymentStatus },
    })
    if (result.count === 0) return false
    await releaseReservedStock(tx, id)
    return true
  })
}

/**
 * Pedidos PENDING creados antes de `before` que nunca recibieron ninguna
 * notificación de la pasarela (sin `paymentReference`): el cliente abrió el
 * checkout de ePayco pero no completó el pago.
 */
export async function findAbandonedPendingOrders(before: Date) {
  return prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentReference: null,
      createdAt: { lt: before },
    },
    select: { id: true, shippingAddress: true },
  })
}

export interface OrderCustomerDataUpdate {
  customerName: string
  customerEmail: string
  customerDocumentType?: string | null
  customerDocument?: string | null
  customerPhone?: string | null
  shippingAddress: Prisma.InputJsonValue
}

export async function updateOrderCustomerData(id: string, data: OrderCustomerDataUpdate) {
  return prisma.order.update({ where: { id }, data })
}

/**
 * Devuelve el stock actual de las variantes solicitadas.
 * Usado para validar disponibilidad antes de crear un pedido.
 */
/**
 * Stock de unas variantes en una tienda física. `tracked` es false si la tienda
 * no tiene inventario cargado (catálogo por Excel, sin ERP): ahí no hay con qué validar.
 */
export async function getStoreVariantsStock(storeLocationId: string, variantIds: string[]) {
  const [tracked, levels] = await Promise.all([
    prisma.inventoryLevel.count({ where: { storeLocationId } }),
    prisma.inventoryLevel.findMany({
      where: { storeLocationId, variantId: { in: variantIds } },
      select: { variantId: true, stock: true },
    }),
  ])
  return { tracked: tracked > 0, stockByVariant: new Map(levels.map((l) => [l.variantId, l.stock])) }
}

export async function getVariantsStock(variantIds: string[]) {
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, stock: true, sku: true },
  })
  return variants.map(v => ({
    id: v.id,
    stock: v.stock,
    sku: v.sku
  }))
}

/**
 * Refleja la venta en el desglose por sede: descuenta de las tiendas con más
 * existencias hasta cubrir la cantidad. `Variant.stock` sigue siendo la fuente
 * transaccional; el ERP vuelve a alinear el desglose en la próxima sincronización.
 */
async function decrementStoreInventory(
  tx: Prisma.TransactionClient,
  variantId: string,
  quantity: number
): Promise<void> {
  const levels = await tx.inventoryLevel.findMany({
    where: { variantId, storeLocationId: { not: null }, stock: { gt: 0 } },
    orderBy: { stock: "desc" },
    select: { id: true, stock: true },
  })
  let remaining = quantity
  for (const level of levels) {
    if (remaining <= 0) break
    const taken = Math.min(level.stock, remaining)
    await tx.inventoryLevel.update({
      where: { id: level.id },
      data: { stock: { decrement: taken } },
    })
    remaining -= taken
  }
}

/**
 * Marca un pedido como PAID (pago APPROVED con `paidAt`) y descuenta el stock
 * de cada variante dentro de una transacción. Re-valida el stock para evitar
 * sobreventa por condiciones de carrera. Idempotente: si el pedido ya está
 * PAID no descuenta de nuevo.
 */
export async function markOrderPaidWithStock(
  id: string,
  trackingNumber?: string,
  carrier?: ShippingCarrier | null
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) throw new Error("Pedido no encontrado.")

    // Idempotencia: no descontar dos veces si ya estaba pagado.
    if (order.status === "PAID") {
      if (trackingNumber !== undefined || carrier !== undefined) {
        return tx.order.update({
          where: { id },
          data: {
            ...(trackingNumber !== undefined ? { trackingNumber } : {}),
            ...(carrier !== undefined ? { carrier } : {}),
          },
        })
      }
      return order
    }

    // Reclama la transición → PAID de forma atómica ANTES de tocar el stock.
    // La lectura de arriba no basta: la transacción corre en READ COMMITTED, así
    // que dos reintentos concurrentes del webhook de ePayco pueden leer ambos el
    // estado previo. El UPDATE condicional bloquea la fila y reevalúa el WHERE,
    // de modo que solo una transacción afecta una fila y descuenta existencias.
    const claimed = await tx.order.updateMany({
      where: { id, status: { not: "PAID" } },
      data: {
        status: "PAID",
        paymentStatus: "APPROVED",
        paidAt: new Date(),
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(carrier !== undefined ? { carrier } : {}),
      },
    })
    if (claimed.count === 0) {
      // Otra entrega ganó la carrera y ya descontó el stock.
      return tx.order.findUniqueOrThrow({ where: { id } })
    }

    // Si el checkout apartó las unidades, ya están descontadas: se consume la
    // reserva en vez de restar otra vez. Condicional, para no chocar con una
    // liberación por vencimiento que corra al mismo tiempo.
    const consumedReservation = await tx.order.updateMany({
      where: { id, stockReserved: true },
      data: { stockReserved: false },
    })
    const alreadyDiscounted = consumedReservation.count === 1

    for (const item of order.items) {
      if (!item.variantId) continue
      if (alreadyDiscounted) {
        await decrementStoreInventory(tx, item.variantId, item.quantity)
        continue
      }
      // Decremento condicional: el propio UPDATE revalida las existencias sobre
      // la fila bloqueada, así dos ventas simultáneas no dejan el stock negativo.
      const decremented = await tx.variant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (decremented.count === 0) {
        // Revierte la reclamación de PAID junto con el resto de la transacción.
        throw new Error(
          `Stock insuficiente para completar el pedido (variante ${item.variantId}).`
        )
      }
      await decrementStoreInventory(tx, item.variantId, item.quantity)
    }

    return tx.order.findUniqueOrThrow({ where: { id } })
  })
}

/**
 * Métricas del dashboard. Solo cuentan como pedidos los que tienen el pago
 * confirmado; los "pendientes" son ventas pagadas que aún no se despachan.
 */
export async function getOrderStats() {
  const [total, pending] = await Promise.all([
    prisma.order.count({ where: { paymentStatus: "APPROVED" } }),
    prisma.order.count({ where: { status: "PAID" } }),
  ])

  const revenueResult = await prisma.order.aggregate({
    _sum: { total: true },
    where: { paymentStatus: "APPROVED", status: { not: "CANCELLED" } },
  })

  return {
    totalCount: total,
    pendingCount: pending,
    revenue: revenueResult._sum.total?.toNumber() ?? 0,
  }
}

export async function updateOrderPaymentReference(id: string, paymentReference: string) {
  return prisma.order.update({ where: { id }, data: { paymentReference } })
}

export async function updateOrderPaymentMethod(id: string, paymentMethod: string) {
  return prisma.order.update({ where: { id }, data: { paymentMethod } })
}

/**
 * Vincula los pedidos anteriores de un correo invitado a la cuenta creada.
 * Solo afecta pedidos donde userId sea null.
 */
export async function linkGuestOrdersByEmail(email: string, userId: string): Promise<number> {
  const result = await prisma.order.updateMany({
    where: {
      customerEmail: { equals: email.trim(), mode: "insensitive" },
      userId: null,
    },
    data: { userId },
  })
  return result.count
}

export async function findGuestOrdersByEmail(email: string) {
  return prisma.order.findMany({
    where: {
      customerEmail: { equals: email.trim(), mode: "insensitive" },
      userId: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      customerDocument: true,
      createdAt: true,
    },
  })
}


/**
 * Pedidos cuyo id termina en el número corto que ve el cliente (últimos 8
 * caracteres). Lo usa la consulta pública de seguimiento, que además exige el correo.
 * shortcut: `endsWith` recorre la tabla (sin índice); con decenas de miles de pedidos, guardar el número corto en una columna indexada.
 */
export async function findOrdersByShortNumber(shortNumber: string) {
  return prisma.order.findMany({
    where: { id: { endsWith: shortNumber, mode: "insensitive" } },
    include: { items: { include: { product: true, variant: true } }, user: true },
    take: 5,
  })
}

export type OrderTimelineField = "shippedAt" | "readyForPickupAt" | "deliveredAt"

/** Guarda la fecha de un paso del recorrido solo la primera vez (volver a guardar el estado no la mueve). */
export async function stampOrderTimeline(id: string, field: OrderTimelineField) {
  return prisma.order.updateMany({ where: { id, [field]: null }, data: { [field]: new Date() } })
}
