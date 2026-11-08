import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { variantUpdateMany, variantUpdate, orderCreate, orderUpdateMany, orderFindMany, itemFindMany, orderFindUnique, itemGroupBy } = vi.hoisted(() => ({
  variantUpdateMany: vi.fn(),
  variantUpdate: vi.fn(),
  orderCreate: vi.fn(),
  orderUpdateMany: vi.fn(),
  orderFindMany: vi.fn(),
  itemFindMany: vi.fn(),
  orderFindUnique: vi.fn(),
  itemGroupBy: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => {
  const tx = {
    variant: { updateMany: variantUpdateMany, update: variantUpdate },
    order: { create: orderCreate, updateMany: orderUpdateMany },
    orderItem: { findMany: itemFindMany },
  }
  return {
    prisma: {
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
      order: { findMany: orderFindMany, findUnique: orderFindUnique, updateMany: orderUpdateMany },
      orderItem: { groupBy: itemGroupBy },
    },
  }
})

import {
  createOrderReservingStock,
  extendStockReservation,
  getReservedQuantities,
  releaseExpiredStockReservations,
  releaseOrderStockReservation,
  StockReservationError,
} from "../order.repository"

const until = new Date("2026-11-07T20:15:00Z")

describe("createOrderReservingStock", () => {
  beforeEach(() => vi.clearAllMocks())

  it("descuenta las unidades con condición de stock y crea el pedido marcado como reservado", async () => {
    variantUpdateMany.mockResolvedValue({ count: 1 })
    orderCreate.mockResolvedValue({ id: "order-1" })

    await createOrderReservingStock({ total: 1 } as never, [{ variantId: "v1", quantity: 2 }], until)

    expect(variantUpdateMany).toHaveBeenCalledWith({
      where: { id: "v1", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    })
    expect(orderCreate).toHaveBeenCalledWith({
      data: { total: 1, stockReserved: true, stockReservedUntil: until },
      include: { items: true },
    })
  })

  it("si la última unidad ya se fue, falla sin crear el pedido", async () => {
    variantUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })

    await expect(
      createOrderReservingStock({} as never, [{ variantId: "v1", quantity: 1 }, { variantId: "v2", quantity: 1 }], until)
    ).rejects.toBeInstanceOf(StockReservationError)
    expect(orderCreate).not.toHaveBeenCalled()
  })
})

describe("releaseExpiredStockReservations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("solo toma reservas vencidas de pedidos sin pago iniciado y devuelve sus unidades", async () => {
    const now = new Date("2026-11-07T20:30:00Z")
    orderFindMany.mockResolvedValue([{ id: "order-1" }])
    orderUpdateMany.mockResolvedValue({ count: 1 })
    itemFindMany.mockResolvedValue([{ variantId: "v1", quantity: 1 }])

    const released = await releaseExpiredStockReservations(now)

    expect(orderFindMany).toHaveBeenCalledWith({
      where: {
        stockReserved: true,
        paymentStatus: "PENDING",
        OR: [
          { paymentReference: null, stockReservedUntil: { lt: now } },
          { paymentReference: { not: null }, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
      select: { id: true },
    })
    expect(released).toEqual(["order-1"])
    expect(variantUpdate).toHaveBeenCalledWith({ where: { id: "v1" }, data: { stock: { increment: 1 } } })
  })

  it("no devuelve nada si el pago ganó la carrera y consumió la reserva", async () => {
    orderFindMany.mockResolvedValue([{ id: "order-1" }])
    orderUpdateMany.mockResolvedValue({ count: 0 })

    expect(await releaseExpiredStockReservations(new Date())).toEqual([])
    expect(variantUpdate).not.toHaveBeenCalled()
  })
})

describe("releaseOrderStockReservation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("devuelve las unidades una sola vez", async () => {
    orderUpdateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    itemFindMany.mockResolvedValue([{ variantId: "v1", quantity: 2 }])

    expect(await releaseOrderStockReservation("order-1")).toBe(true)
    expect(await releaseOrderStockReservation("order-1")).toBe(false)
    expect(variantUpdate).toHaveBeenCalledTimes(1)
  })
})

describe("extendStockReservation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("fija el plazo desde la creación del pedido, así repetirlo no lo alarga", async () => {
    orderFindUnique.mockResolvedValue({ createdAt: new Date("2026-11-07T20:00:00Z") })
    orderUpdateMany.mockResolvedValue({ count: 1 })

    await extendStockReservation("order-1")

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", stockReserved: true, paymentStatus: "PENDING" },
      data: { stockReservedUntil: new Date("2026-11-07T20:45:00Z") },
    })
  })

  it("no hace nada si el pedido no existe", async () => {
    orderFindUnique.mockResolvedValue(null)
    await extendStockReservation("nope")
    expect(orderUpdateMany).not.toHaveBeenCalled()
  })
})

describe("getReservedQuantities", () => {
  it("suma por variante lo apartado", async () => {
    itemGroupBy.mockResolvedValue([{ variantId: "v1", _sum: { quantity: 3 } }])
    expect(await getReservedQuantities()).toEqual(new Map([["v1", 3]]))
  })
})
