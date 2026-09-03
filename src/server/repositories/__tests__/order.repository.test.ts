import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

const { orderFindUnique, orderFindUniqueOrThrow, orderUpdate, orderUpdateMany, variantUpdateMany, transaction } =
  vi.hoisted(() => ({
    orderFindUnique: vi.fn(),
    orderFindUniqueOrThrow: vi.fn(),
    orderUpdate: vi.fn(),
    orderUpdateMany: vi.fn(),
    variantUpdateMany: vi.fn(),
    transaction: vi.fn(),
  }))

const tx = {
  order: {
    findUnique: orderFindUnique,
    findUniqueOrThrow: orderFindUniqueOrThrow,
    update: orderUpdate,
    updateMany: orderUpdateMany,
  },
  variant: { updateMany: variantUpdateMany },
}

vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: transaction },
}))

import { markOrderPaidWithStock } from "../order.repository"

const pendingOrder = {
  id: "order-1",
  status: "PENDING",
  items: [{ variantId: "variant-a", quantity: 2 }],
}

describe("markOrderPaidWithStock", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    transaction.mockImplementation((fn: (client: typeof tx) => unknown) => fn(tx))
    orderFindUnique.mockResolvedValue(pendingOrder)
    orderFindUniqueOrThrow.mockResolvedValue({ id: "order-1", status: "PAID" })
    orderUpdateMany.mockResolvedValue({ count: 1 })
    variantUpdateMany.mockResolvedValue({ count: 1 })
  })

  it("reclama la transición a PAID condicionada al estado previo", async () => {
    await markOrderPaidWithStock("order-1")

    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { id: "order-1", status: { not: "PAID" } },
      data: { status: "PAID" },
    })
  })

  it("descuenta stock condicionado a que alcancen las existencias", async () => {
    await markOrderPaidWithStock("order-1")

    expect(variantUpdateMany).toHaveBeenCalledWith({
      where: { id: "variant-a", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    })
  })

  it("no descuenta stock cuando otra entrega ya reclamó el pedido", async () => {
    // Reintento concurrente del webhook: el pedido se leyó como PENDING pero al
    // reclamarlo ya estaba PAID, así que no debe volver a descontar existencias.
    orderUpdateMany.mockResolvedValue({ count: 0 })

    await markOrderPaidWithStock("order-1")

    expect(variantUpdateMany).not.toHaveBeenCalled()
  })

  it("falla sin descontar cuando el stock es insuficiente", async () => {
    variantUpdateMany.mockResolvedValue({ count: 0 })

    await expect(markOrderPaidWithStock("order-1")).rejects.toThrow(/Stock insuficiente/)
  })

  it("es idempotente si el pedido ya estaba pagado", async () => {
    orderFindUnique.mockResolvedValue({ ...pendingOrder, status: "PAID" })

    await markOrderPaidWithStock("order-1")

    expect(orderUpdateMany).not.toHaveBeenCalled()
    expect(variantUpdateMany).not.toHaveBeenCalled()
  })

  it("actualiza solo el tracking de un pedido ya pagado", async () => {
    orderFindUnique.mockResolvedValue({ ...pendingOrder, status: "PAID" })

    await markOrderPaidWithStock("order-1", "TRACK-9")

    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { trackingNumber: "TRACK-9" },
    })
    expect(variantUpdateMany).not.toHaveBeenCalled()
  })

  it("lanza si el pedido no existe", async () => {
    orderFindUnique.mockResolvedValue(null)

    await expect(markOrderPaidWithStock("order-x")).rejects.toThrow(/Pedido no encontrado/)
  })
})
