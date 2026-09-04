import "server-only"
import { prisma } from "../db/prisma"

/** Ventana de comparación de los KPI: últimos N días contra los N anteriores. */
export const DASHBOARD_PERIOD_DAYS = 30

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export async function getDashboardData() {
  const thirtyDaysAgo = daysAgo(DASHBOARD_PERIOD_DAYS)
  const sixtyDaysAgo = daysAgo(DASHBOARD_PERIOD_DAYS * 2)
  const notCancelled = { status: { not: "CANCELLED" as const } }

  const [
    gmvResult,
    totalProductsCount,
    totalCustomersCount,
    pendingOrdersCount,
    orderItemsRaw,
    lowStockRaw,
    revenueByDayRaw,
    ordersByStatusRaw,
    currentPeriodOrders,
    previousPeriodOrders,
    currentPeriodCustomers,
    previousPeriodCustomers,
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
    // Tendencias reales: mismo agregado que el GMV, acotado a cada ventana.
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: { ...notCancelled, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.order.aggregate({
      _sum: { total: true },
      _count: { id: true },
      where: { ...notCancelled, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
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
    currentPeriodOrders,
    previousPeriodOrders,
    currentPeriodCustomers,
    previousPeriodCustomers,
  }
}
