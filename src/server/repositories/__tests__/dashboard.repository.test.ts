import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  orderAggregate: vi.fn(),
  orderCount: vi.fn(),
  orderFindMany: vi.fn(),
  orderGroupBy: vi.fn(),
  productCount: vi.fn(),
  productFindMany: vi.fn(),
  userCount: vi.fn(),
  orderItemGroupBy: vi.fn(),
  variantFindMany: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    order: {
      aggregate: m.orderAggregate,
      count: m.orderCount,
      findMany: m.orderFindMany,
      groupBy: m.orderGroupBy,
    },
    product: { count: m.productCount, findMany: m.productFindMany },
    user: { count: m.userCount },
    orderItem: { groupBy: m.orderItemGroupBy },
    variant: { findMany: m.variantFindMany },
  },
}))

import { getDashboardData } from "../dashboard.repository"

function respuestasBase() {
  m.orderAggregate.mockResolvedValue({ _sum: { total: null }, _count: { id: 0 } })
  m.productCount.mockResolvedValue(0)
  m.userCount.mockResolvedValue(0)
  m.orderCount.mockResolvedValue(0)
  m.orderItemGroupBy.mockResolvedValue([])
  m.variantFindMany.mockResolvedValue([])
  m.orderFindMany.mockResolvedValue([])
  m.orderGroupBy.mockResolvedValue([])
  m.productFindMany.mockResolvedValue([])
}

beforeEach(() => {
  vi.clearAllMocks()
  respuestasBase()
})

describe("getDashboardData", () => {
  it("excluye los pedidos cancelados del GMV", async () => {
    await getDashboardData()

    expect(m.orderAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { not: "CANCELLED" } } })
    )
  })

  it("limita el bajo stock a variantes con 3 unidades o menos", async () => {
    await getDashboardData()

    expect(m.variantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stock: { lte: 3 } },
        orderBy: { stock: "asc" },
        take: 20,
      })
    )
  })

  it("toma los ingresos de los últimos 30 días", async () => {
    await getDashboardData()

    const where = m.orderFindMany.mock.calls[0][0].where
    expect(where.createdAt.gte).toBeInstanceOf(Date)
    const dias = (Date.now() - where.createdAt.gte.getTime()) / 86_400_000
    expect(Math.round(dias)).toBe(30)
  })

  it("no consulta productos cuando todavía no hay ítems vendidos", async () => {
    const data = await getDashboardData()

    expect(m.productFindMany).not.toHaveBeenCalled()
    expect(data.topProductsData).toEqual([])
  })

  it("resuelve el nombre de la marca de los productos más vendidos", async () => {
    m.orderItemGroupBy.mockResolvedValue([{ productId: "prod_1" }])
    m.productFindMany.mockResolvedValue([
      { id: "prod_1", name: "Air Force 1", brand: { name: "Nike" } },
    ])

    const data = await getDashboardData()

    expect(data.topProductsData).toEqual([
      { id: "prod_1", name: "Air Force 1", brand: "Nike" },
    ])
  })

  it("deja la marca en null cuando el producto no tiene una asignada", async () => {
    m.orderItemGroupBy.mockResolvedValue([{ productId: "prod_1" }])
    m.productFindMany.mockResolvedValue([{ id: "prod_1", name: "Genérico", brand: null }])

    const data = await getDashboardData()

    expect(data.topProductsData[0].brand).toBeNull()
  })
})
