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

export interface DashboardStatsDTO {
  gmv: number
  aov: number
  totalProducts: number
  totalCustomers: number
  pendingOrders: number
  topProducts: TopProductDTO[]
  lowStockVariants: LowStockVariantDTO[]
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

    return {
      gmv,
      aov,
      totalProducts: rawData.totalProductsCount,
      totalCustomers: rawData.totalCustomersCount,
      pendingOrders: rawData.pendingOrdersCount,
      topProducts,
      lowStockVariants
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[DashboardService] Error:", error)
    }
    return {
      gmv: 0,
      aov: 0,
      totalProducts: 0,
      totalCustomers: 0,
      pendingOrders: 0,
      topProducts: [],
      lowStockVariants: []
    }
  }
}
