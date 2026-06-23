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
  return prisma.variant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, stock: true, sku: true },
  })
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

    for (const item of order.items) {
      if (!item.variantId) continue
      const variant = await tx.variant.findUnique({ where: { id: item.variantId } })
      if (!variant || variant.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para completar el pedido (variante ${item.variantId}).`
        )
      }
      await tx.variant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    return tx.order.update({
      where: { id },
      data: {
        status: "PAID",
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      },
    })
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
