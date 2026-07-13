import "server-only"
import { getDashboardData } from "../repositories/dashboard.repository"

export interface TopProductDTO {
  name: string
  brand: string
  sold: number
  revenue: number
}

export interface LowStockVariantDTO {
  sku: string
  productName: string
  size: string
  color: string
  stock: number
}

export interface RevenueByDayDTO {
  date: string
  revenue: number
}

export interface OrdersByStatusDTO {
  status: string
  count: number
}

export interface DashboardStatsDTO {
  gmv: number
  aov: number
  totalProducts: number
  totalCustomers: number
  pendingOrders: number
  topProducts: TopProductDTO[]
  lowStockVariants: LowStockVariantDTO[]
  revenueByDay: RevenueByDayDTO[]
  ordersByStatus: OrdersByStatusDTO[]
}

export async function getAdminDashboardStats(): Promise<DashboardStatsDTO> {
  try {
    const rawData = await getDashboardData()

    const rawGmv = Number(rawData.gmvResult._sum.total ?? 0)
    const orderCount = rawData.gmvResult._count.id

    const gmv = rawGmv
    const aov = orderCount > 0 ? Math.round(rawGmv / orderCount) : 0

    const productMap = new Map(rawData.topProductsData.map((p) => [p.id, p]))

    const topProducts = rawData.orderItemsRaw.map((oi) => {
      const product = productMap.get(oi.productId)
      const sold = oi._sum.quantity ?? 0
      const unitPrice = Number(oi._sum.unitPrice ?? 0)
      return {
        name: product?.name ?? "Producto eliminado",
        brand: product?.brand ?? "-",
        sold,
        revenue: Math.round(unitPrice * sold),
      }
    })

    const lowStockVariants = rawData.lowStockRaw.map((v) => ({
      sku: v.sku,
      productName: v.product.name,
      size: v.size,
      color: v.color,
      stock: v.stock,
    }))

    const revenueByDayMap = new Map<string, number>()
    for (const order of rawData.revenueByDayRaw) {
      const key = order.createdAt.toISOString().slice(0, 10)
      revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + Number(order.total))
    }
    const revenueByDay: RevenueByDayDTO[] = Array.from(revenueByDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue: Math.round(revenue) }))

    const statusLabels: Record<string, string> = {
      PENDING: "Pendiente",
      PAID: "Pagado",
      SHIPPED: "Enviado",
      DELIVERED: "Entregado",
      CANCELLED: "Cancelado",
    }
    const ordersByStatus: OrdersByStatusDTO[] = rawData.ordersByStatusRaw.map((s) => ({
      status: statusLabels[s.status] ?? s.status,
      count: s._count.id,
    }))

    return {
      gmv,
      aov,
      totalProducts: rawData.totalProductsCount,
      totalCustomers: rawData.totalCustomersCount,
      pendingOrders: rawData.pendingOrdersCount,
      topProducts,
      lowStockVariants,
      revenueByDay,
      ordersByStatus,
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[DashboardService] Error:", error)
    }
    return {
      gmv: 0,
      aov: 0,
      totalProducts: 0,
      totalCustomers: 0,
      pendingOrders: 0,
      topProducts: [],
      lowStockVariants: [],
      revenueByDay: [],
      ordersByStatus: [],
    }
  }
}
