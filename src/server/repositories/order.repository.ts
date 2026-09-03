import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma, OrderStatus } from "@prisma/client"

export async function createOrder(data: Prisma.OrderCreateInput) {
  return prisma.order.create({
    data,
    include: { items: true },
  })
}

export async function findOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
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
      items: { include: { product: true } },
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
  trackingNumber?: string
) {
  return prisma.order.update({
    where: { id },
    data: {
      status: status as OrderStatus,
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
    },
  })
}

/**
 * Devuelve el stock actual de las variantes solicitadas.
 * Usado para validar disponibilidad antes de crear un pedido.
 */
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
 * Marca un pedido como PAID y descuenta el stock de cada variante dentro de
 * una transacción. Re-valida el stock para evitar sobreventa por condiciones
 * de carrera. Idempotente: si el pedido ya está PAID no descuenta de nuevo.
 */
export async function markOrderPaidWithStock(id: string, trackingNumber?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!order) throw new Error("Pedido no encontrado.")

    // Idempotencia: no descontar dos veces si ya estaba pagado.
    if (order.status === "PAID") {
      if (trackingNumber !== undefined) {
        return tx.order.update({ where: { id }, data: { trackingNumber } })
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
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      },
    })
    if (claimed.count === 0) {
      // Otra entrega ganó la carrera y ya descontó el stock.
      return tx.order.findUniqueOrThrow({ where: { id } })
    }

    for (const item of order.items) {
      if (!item.variantId) continue
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
    }

    return tx.order.findUniqueOrThrow({ where: { id } })
  })
}

export async function getOrderStats() {
  const [total, pending] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
  ])

  const revenueResult = await prisma.order.aggregate({
    _sum: { total: true },
    where: { status: "PAID" },
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
