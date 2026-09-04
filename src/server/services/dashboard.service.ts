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

export type TrendDirection = "up" | "down" | "flat"

/** Variación porcentual de los últimos 30 días frente a los 30 anteriores. */
export interface TrendDTO {
  percent: number
  direction: TrendDirection
}

export interface DashboardTrendsDTO {
  /** null = no hay período anterior con datos para comparar. */
  gmv: TrendDTO | null
  aov: TrendDTO | null
  newCustomers: TrendDTO | null
}

export interface DashboardStatsDTO {
  gmv: number
  aov: number
  totalProducts: number
  totalCustomers: number
  /** Clientes registrados en los últimos 30 días. */
  newCustomers: number
  pendingOrders: number
  trends: DashboardTrendsDTO
  topProducts: TopProductDTO[]
  lowStockVariants: LowStockVariantDTO[]
  revenueByDay: RevenueByDayDTO[]
  ordersByStatus: OrdersByStatusDTO[]
}

const EMPTY_TRENDS: DashboardTrendsDTO = { gmv: null, aov: null, newCustomers: null }

/**
 * Variación porcentual entre dos períodos. Sin base de comparación (período
 * anterior en cero) devuelve null en lugar de inventar un porcentaje.
 */
export function computeTrend(current: number, previous: number): TrendDTO | null {
  if (!Number.isFinite(previous) || previous <= 0) return null
  const percent = Math.round(((current - previous) / previous) * 100)
  const direction: TrendDirection = percent > 0 ? "up" : percent < 0 ? "down" : "flat"
  return { percent, direction }
}

function averageTicket(total: number, count: number): number {
  return count > 0 ? Math.round(total / count) : 0
}

export async function getAdminDashboardStats(): Promise<DashboardStatsDTO> {
  try {
    const rawData = await getDashboardData()

    const rawGmv = Number(rawData.gmvResult._sum.total ?? 0)
    const orderCount = rawData.gmvResult._count.id

    const gmv = rawGmv
    const aov = averageTicket(rawGmv, orderCount)

    const currentGmv = Number(rawData.currentPeriodOrders._sum.total ?? 0)
    const previousGmv = Number(rawData.previousPeriodOrders._sum.total ?? 0)
    const trends: DashboardTrendsDTO = {
      gmv: computeTrend(currentGmv, previousGmv),
      aov: computeTrend(
        averageTicket(currentGmv, rawData.currentPeriodOrders._count.id),
        averageTicket(previousGmv, rawData.previousPeriodOrders._count.id),
      ),
      newCustomers: computeTrend(rawData.currentPeriodCustomers, rawData.previousPeriodCustomers),
    }

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
      newCustomers: rawData.currentPeriodCustomers,
      pendingOrders: rawData.pendingOrdersCount,
      trends,
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
      newCustomers: 0,
      pendingOrders: 0,
      trends: EMPTY_TRENDS,
      topProducts: [],
      lowStockVariants: [],
      revenueByDay: [],
      ordersByStatus: [],
    }
  }
}
