import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/dashboard.repository", () => ({
  getDashboardData: vi.fn(),
}))

import { computeTrend, getAdminDashboardStats } from "../dashboard.service"
import { getDashboardData } from "@/server/repositories/dashboard.repository"

const mockGetData = vi.mocked(getDashboardData)

const baseDashboardData = {
  gmvResult: { _sum: { total: 500000 }, _count: { id: 5 } },
  topProductsData: [
    { id: "prod-1", name: "Nike Air Max", brand: "Nike" },
    { id: "prod-2", name: "Adidas Ultraboost", brand: "Adidas" },
  ],
  orderItemsRaw: [
    { productId: "prod-1", _sum: { quantity: 10, unitPrice: 150000 } },
    { productId: "prod-2", _sum: { quantity: 5, unitPrice: 200000 } },
  ],
  lowStockRaw: [
    { sku: "NK-001", product: { name: "Nike Air Max" }, size: "42", color: "Negro", stock: 2 },
  ],
  revenueByDayRaw: [
    { createdAt: new Date("2024-06-01"), total: 150000 },
    { createdAt: new Date("2024-06-01"), total: 50000 },
    { createdAt: new Date("2024-06-02"), total: 300000 },
  ],
  ordersByStatusRaw: [
    { status: "PENDING", _count: { id: 3 } },
    { status: "SHIPPED", _count: { id: 2 } },
    { status: "DELIVERED", _count: { id: 8 } },
  ],
  totalProductsCount: 120,
  totalCustomersCount: 45,
  pendingOrdersCount: 3,
  currentPeriodOrders: { _sum: { total: 300000 }, _count: { id: 3 } },
  previousPeriodOrders: { _sum: { total: 200000 }, _count: { id: 4 } },
  currentPeriodCustomers: 12,
  previousPeriodCustomers: 10,
}

describe("getAdminDashboardStats", () => {
  beforeEach(() => vi.clearAllMocks())

  it("calcula GMV correctamente", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    expect(result.gmv).toBe(500000)
  })

  it("calcula AOV (ticket promedio) dividiendo GMV entre cantidad de pedidos", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    expect(result.aov).toBe(100000) // 500000 / 5
  })

  it("AOV es 0 cuando no hay pedidos", async () => {
    mockGetData.mockResolvedValue({
      ...baseDashboardData,
      gmvResult: { _sum: { total: 0 }, _count: { id: 0 } },
    } as never)
    const result = await getAdminDashboardStats()
    expect(result.aov).toBe(0)
  })

  it("expone totales de productos y clientes", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    expect(result.totalProducts).toBe(120)
    expect(result.totalCustomers).toBe(45)
    expect(result.pendingOrders).toBe(3)
  })

  it("mapea los top productos con nombre, marca y revenue calculado", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    const nike = result.topProducts.find((p) => p.name === "Nike Air Max")
    expect(nike).toBeDefined()
    expect(nike!.brand).toBe("Nike")
    expect(nike!.sold).toBe(10)
    expect(nike!.revenue).toBe(1500000) // 150000 * 10
  })

  it("usa 'Producto eliminado' cuando el producto ya no existe", async () => {
    mockGetData.mockResolvedValue({
      ...baseDashboardData,
      topProductsData: [], // sin productos en el mapa
    } as never)
    const result = await getAdminDashboardStats()
    expect(result.topProducts[0].name).toBe("Producto eliminado")
    expect(result.topProducts[0].brand).toBe("-")
  })

  it("mapea variantes con bajo stock", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    expect(result.lowStockVariants).toHaveLength(1)
    expect(result.lowStockVariants[0].sku).toBe("NK-001")
    expect(result.lowStockVariants[0].stock).toBe(2)
  })

  it("agrupa revenue por día y ordena cronológicamente", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    expect(result.revenueByDay).toHaveLength(2)
    expect(result.revenueByDay[0].date).toBe("2024-06-01")
    expect(result.revenueByDay[0].revenue).toBe(200000) // 150000 + 50000
    expect(result.revenueByDay[1].date).toBe("2024-06-02")
    expect(result.revenueByDay[1].revenue).toBe(300000)
  })

  it("traduce los status de pedidos al español", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    const pending = result.ordersByStatus.find((s) => s.status === "Pendiente")
    const shipped = result.ordersByStatus.find((s) => s.status === "Enviado")
    expect(pending!.count).toBe(3)
    expect(shipped!.count).toBe(2)
  })

  it("calcula tendencias reales de 30 días contra los 30 anteriores", async () => {
    mockGetData.mockResolvedValue(baseDashboardData as never)
    const result = await getAdminDashboardStats()
    expect(result.trends.gmv).toEqual({ percent: 50, direction: "up" }) // 300k vs 200k
    // AOV: 100000 (300k/3) vs 50000 (200k/4)
    expect(result.trends.aov).toEqual({ percent: 100, direction: "up" })
    expect(result.trends.newCustomers).toEqual({ percent: 20, direction: "up" })
    expect(result.newCustomers).toBe(12)
  })

  it("no inventa tendencias cuando el período anterior está en cero", async () => {
    mockGetData.mockResolvedValue({
      ...baseDashboardData,
      previousPeriodOrders: { _sum: { total: null }, _count: { id: 0 } },
      previousPeriodCustomers: 0,
    } as never)
    const result = await getAdminDashboardStats()
    expect(result.trends).toEqual({ gmv: null, aov: null, newCustomers: null })
  })

  it("retorna stats vacías cuando el repositorio lanza error", async () => {
    mockGetData.mockRejectedValue(new Error("DB connection failed"))
    const result = await getAdminDashboardStats()
    expect(result.gmv).toBe(0)
    expect(result.aov).toBe(0)
    expect(result.topProducts).toEqual([])
    expect(result.revenueByDay).toEqual([])
    expect(result.trends).toEqual({ gmv: null, aov: null, newCustomers: null })
  })
})

describe("computeTrend", () => {
  it("devuelve null sin base de comparación", () => {
    expect(computeTrend(100, 0)).toBeNull()
    expect(computeTrend(0, 0)).toBeNull()
  })

  it("redondea el porcentaje y marca la dirección", () => {
    expect(computeTrend(150, 100)).toEqual({ percent: 50, direction: "up" })
    expect(computeTrend(75, 100)).toEqual({ percent: -25, direction: "down" })
    expect(computeTrend(100, 100)).toEqual({ percent: 0, direction: "flat" })
    expect(computeTrend(0, 100)).toEqual({ percent: -100, direction: "down" })
  })
})
