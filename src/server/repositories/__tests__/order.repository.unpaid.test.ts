import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { orderUpdateMany, orderFindMany, orderUpdate, orderCount, orderAggregate } = vi.hoisted(() => ({
  orderUpdateMany: vi.fn(),
  orderFindMany: vi.fn(),
  orderUpdate: vi.fn(),
  orderCount: vi.fn(),
  orderAggregate: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    order: {
      updateMany: orderUpdateMany,
      findMany: orderFindMany,
      update: orderUpdate,
      count: orderCount,
      aggregate: orderAggregate,
    },
  },
}))

import {
  closeUnpaidOrder,
  findAbandonedPendingOrders,
  getOrderStats,
  updateOrderCustomerData,
} from "../order.repository"

describe("closeUnpaidOrder", () => {
  beforeEach(() => vi.clearAllMocks())

  it("cancela solo si el pago no está aprobado y el pedido no estaba cancelado", async () => {
    orderUpdateMany.mockResolvedValue({ count: 1 })

    const closed = await closeUnpaidOrder("order-1", "EXPIRED")

    expect(closed).toBe(true)
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", paymentStatus: { not: "APPROVED" }, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED", paymentStatus: "EXPIRED" },
    })
  })

  it("devuelve false cuando la condición no afectó filas", async () => {
    orderUpdateMany.mockResolvedValue({ count: 0 })

    expect(await closeUnpaidOrder("order-1", "REJECTED")).toBe(false)
  })
})

describe("findAbandonedPendingOrders", () => {
  it("busca PENDING sin referencia de pasarela anteriores a la fecha", async () => {
    orderFindMany.mockResolvedValue([])
    const before = new Date("2026-09-06T00:00:00Z")

    await findAbandonedPendingOrders(before)

    expect(orderFindMany).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentReference: null,
        createdAt: { lt: before },
      },
      select: { id: true, shippingAddress: true },
    })
  })
})

describe("updateOrderCustomerData", () => {
  it("actualiza nombre, correo y dirección", async () => {
    orderUpdate.mockResolvedValue({})
    const data = {
      customerName: "Ana",
      customerEmail: "ana@example.com",
      shippingAddress: { city: "Cali" },
    }

    await updateOrderCustomerData("order-1", data)

    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: "order-1" }, data })
  })
})

describe("getOrderStats", () => {
  it("solo cuenta ventas con pago aprobado y pendientes = pagados por despachar", async () => {
    orderCount.mockResolvedValueOnce(10).mockResolvedValueOnce(3)
    orderAggregate.mockResolvedValue({ _sum: { total: { toNumber: () => 500000 } } })

    const stats = await getOrderStats()

    expect(orderCount).toHaveBeenNthCalledWith(1, { where: { paymentStatus: "APPROVED" } })
    expect(orderCount).toHaveBeenNthCalledWith(2, { where: { status: "PAID" } })
    expect(orderAggregate).toHaveBeenCalledWith({
      _sum: { total: true },
      where: { paymentStatus: "APPROVED", status: { not: "CANCELLED" } },
    })
    expect(stats).toEqual({ totalCount: 10, pendingCount: 3, revenue: 500000 })
  })
})
