import "server-only"
import { prisma } from "../db/prisma"

export async function getDashboardData() {
  const [
    gmvResult,
    totalProductsCount,
    totalCustomersCount,
    pendingOrdersCount,
    orderItemsRaw,
    lowStockRaw,
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
  ])

  let products: Array<{ id: string; name: string; brand: string | null }> = []
  if (orderItemsRaw.length > 0) {
    const productIds = orderItemsRaw.map((oi) => oi.productId)
    products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, brand: true }
    })
  }

  return {
    gmvResult,
    totalProductsCount,
    totalCustomersCount,
    pendingOrdersCount,
    orderItemsRaw,
    lowStockRaw,
    topProductsData: products
  }
}
