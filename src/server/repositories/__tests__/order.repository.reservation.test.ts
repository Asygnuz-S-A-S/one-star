import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { variantUpdateMany, variantUpdate, orderCreate, orderUpdateMany, orderFindMany, itemFindMany } = vi.hoisted(() => ({
  variantUpdateMany: vi.fn(),
  variantUpdate: vi.fn(),
  orderCreate: vi.fn(),
  orderUpdateMany: vi.fn(),
  orderFindMany: vi.fn(),
  itemFindMany: vi.fn(),
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
      order: { findMany: orderFindMany },
    },
  }
})

import {
  createOrderReservingStock,
  releaseExpiredStockReservations,
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
      where: { stockReserved: true, stockReservedUntil: { lt: now }, paymentStatus: "PENDING", paymentReference: null },
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
