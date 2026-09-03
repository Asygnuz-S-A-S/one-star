import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const tx = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), update: vi.fn() },
  variant: { findUnique: vi.fn(), update: vi.fn() },
  inventoryLevel: { findMany: vi.fn(), update: vi.fn() },
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  },
}))

import { markOrderPaidWithStock } from "../order.repository"

describe("markOrderPaidWithStock", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tx.order.findUnique.mockResolvedValue({
      id: "order-1",
      status: "PENDING",
      items: [{ variantId: "variant-1", quantity: 3 }],
    })
    tx.variant.findUnique.mockResolvedValue({ id: "variant-1", stock: 5 })
    tx.variant.update.mockResolvedValue({})
    tx.inventoryLevel.update.mockResolvedValue({})
    tx.order.update.mockResolvedValue({ id: "order-1", status: "PAID" })
  })

  it("descuenta el total y reparte la venta entre las sedes con más existencias", async () => {
    tx.inventoryLevel.findMany.mockResolvedValue([
      { id: "level-fundadores", stock: 2 },
      { id: "level-centro", stock: 2 },
    ])

    await markOrderPaidWithStock("order-1")

    expect(tx.variant.update).toHaveBeenCalledWith({
      where: { id: "variant-1" },
      data: { stock: { decrement: 3 } },
    })
    expect(tx.inventoryLevel.findMany).toHaveBeenCalledWith({
      where: { variantId: "variant-1", storeLocationId: { not: null }, stock: { gt: 0 } },
      orderBy: { stock: "desc" },
      select: { id: true, stock: true },
    })
    expect(tx.inventoryLevel.update.mock.calls).toEqual([
      [{ where: { id: "level-fundadores" }, data: { stock: { decrement: 2 } } }],
      [{ where: { id: "level-centro" }, data: { stock: { decrement: 1 } } }],
    ])
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "PAID" },
    })
  })

  it("no toca el desglose cuando el total es insuficiente", async () => {
    tx.variant.findUnique.mockResolvedValue({ id: "variant-1", stock: 1 })

    await expect(markOrderPaidWithStock("order-1")).rejects.toThrow("Stock insuficiente")
    expect(tx.inventoryLevel.findMany).not.toHaveBeenCalled()
  })

  it("es idempotente si el pedido ya estaba pagado", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "order-1", status: "PAID", items: [] })

    await markOrderPaidWithStock("order-1")

    expect(tx.variant.update).not.toHaveBeenCalled()
    expect(tx.inventoryLevel.update).not.toHaveBeenCalled()
  })
})
