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
