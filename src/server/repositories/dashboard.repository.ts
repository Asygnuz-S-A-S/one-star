import "server-only"
import { prisma } from "../db/prisma"

export async function getDashboardData() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    gmvResult,
    totalProductsCount,
    totalCustomersCount,
    pendingOrdersCount,
    orderItemsRaw,
    lowStockRaw,
    revenueByDayRaw,
    ordersByStatusRaw,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: { status: { not: "CANCELLED" } },
    }),
    prisma.product.count(),
    prisma.user.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, unitPrice: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.variant.findMany({
      where: { stock: { lte: 3 } },
      include: { product: { select: { name: true, brand: true } } },
      orderBy: { stock: "asc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, total: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ])

  let products: Array<{ id: string; name: string; brand: string | null }> = []
  if (orderItemsRaw.length > 0) {
    const productIds = orderItemsRaw.map((oi) => oi.productId)
    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, brand: { select: { name: true } } }
    })
    products = rows.map((p) => ({ id: p.id, name: p.name, brand: p.brand?.name ?? null }))
  }

  return {
    gmvResult,
    totalProductsCount,
    totalCustomersCount,
    pendingOrdersCount,
    orderItemsRaw,
    lowStockRaw,
    topProductsData: products,
    revenueByDayRaw,
    ordersByStatusRaw,
  }
}
