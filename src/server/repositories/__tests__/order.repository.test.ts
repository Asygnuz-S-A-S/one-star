import { beforeEach, describe, expect, it, vi } from "vitest"
import { Prisma } from "@prisma/client"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  order: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  variant: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
}))

const tx = vi.hoisted(() => ({
  order: { findUnique: vi.fn(), update: vi.fn() },
  variant: { findUnique: vi.fn(), update: vi.fn() },
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    order: m.order,
    variant: m.variant,
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))

import {
  countOrders,
  createOrder,
  findManyOrders,
  findOrderById,
  findOrdersByUserId,
  getOrderStats,
  getVariantsStock,
  markOrderPaidWithStock,
  updateOrderPaymentReference,
  updateOrderStatus,
  updateOrderStatusAndTracking,
} from "../order.repository"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("consultas de pedidos", () => {
  it("crea el pedido devolviendo sus ítems", async () => {
    m.order.create.mockResolvedValue({ id: "ord_1" })

    await createOrder({ total: 1000 } as never)

    expect(m.order.create).toHaveBeenCalledWith({
      data: { total: 1000 },
      include: { items: true },
    })
  })

  it("el detalle incluye ítems con producto y el usuario", async () => {
    m.order.findUnique.mockResolvedValue(null)

    await findOrderById("ord_1")

    expect(m.order.findUnique).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      include: { items: { include: { product: true } }, user: true },
    })
  })

  it("el listado pagina y ordena por fecha descendente", async () => {
    m.order.findMany.mockResolvedValue([])

    await findManyOrders(10, 20, { status: "PAID" })

    expect(m.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 10,
        skip: 20,
      })
    )
  })

  it("los pedidos del cliente traen una sola imagen por producto", async () => {
    m.order.findMany.mockResolvedValue([])

    await findOrdersByUserId("user_1")

    const args = m.order.findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: "user_1" })
    expect(args.include.items.include.product.select.images.take).toBe(1)
  })

  it("cuenta con y sin filtro", async () => {
    m.order.count.mockResolvedValue(4)

    expect(await countOrders()).toBe(4)
    expect(m.order.count).toHaveBeenCalledWith({ where: undefined })
  })
})

describe("actualizaciones de estado", () => {
  it("cambia el estado", async () => {
    m.order.update.mockResolvedValue({ id: "ord_1" })

    await updateOrderStatus("ord_1", "SHIPPED")

    expect(m.order.update).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { status: "SHIPPED" },
    })
  })

  it("omite el número de guía cuando no se envía, en vez de borrarlo", async () => {
    m.order.update.mockResolvedValue({ id: "ord_1" })

    await updateOrderStatusAndTracking("ord_1", "SHIPPED")

    expect(m.order.update.mock.calls[0][0].data).toEqual({ status: "SHIPPED" })
  })

  it("guarda el número de guía cuando se envía", async () => {
    m.order.update.mockResolvedValue({ id: "ord_1" })

    await updateOrderStatusAndTracking("ord_1", "SHIPPED", "GUIA-123")

    expect(m.order.update.mock.calls[0][0].data).toEqual({
      status: "SHIPPED",
      trackingNumber: "GUIA-123",
    })
  })

  it("guarda la referencia de pago", async () => {
    m.order.update.mockResolvedValue({ id: "ord_1" })

    await updateOrderPaymentReference("ord_1", "ref-payco-9")

    expect(m.order.update).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { paymentReference: "ref-payco-9" },
    })
  })
})

describe("getVariantsStock", () => {
  it("devuelve id, stock y sku de las variantes pedidas", async () => {
    m.variant.findMany.mockResolvedValue([{ id: "var_1", stock: 3, sku: "SKU-1" }])

    expect(await getVariantsStock(["var_1"])).toEqual([
      { id: "var_1", stock: 3, sku: "SKU-1" },
    ])
  })
})

describe("markOrderPaidWithStock", () => {
  it("descuenta el stock de cada variante y marca el pedido como pagado", async () => {
    tx.order.findUnique.mockResolvedValue({
      id: "ord_1",
      status: "PENDING",
      items: [{ variantId: "var_1", quantity: 2 }],
    })
    tx.variant.findUnique.mockResolvedValue({ id: "var_1", stock: 5 })
    tx.variant.update.mockResolvedValue({})
    tx.order.update.mockResolvedValue({ id: "ord_1", status: "PAID" })

    await markOrderPaidWithStock("ord_1")

    expect(tx.variant.update).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: { stock: { decrement: 2 } },
    })
    expect(tx.order.update.mock.calls[0][0].data.status).toBe("PAID")
  })

  it("es idempotente: un pedido ya pagado no vuelve a descontar stock", async () => {
    const pagado = { id: "ord_1", status: "PAID", items: [{ variantId: "var_1", quantity: 2 }] }
    tx.order.findUnique.mockResolvedValue(pagado)

    expect(await markOrderPaidWithStock("ord_1")).toBe(pagado)
    expect(tx.variant.update).not.toHaveBeenCalled()
  })

  it("en un pedido ya pagado sí actualiza solo el número de guía", async () => {
    tx.order.findUnique.mockResolvedValue({ id: "ord_1", status: "PAID", items: [] })
    tx.order.update.mockResolvedValue({ id: "ord_1" })

    await markOrderPaidWithStock("ord_1", "GUIA-9")

    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: "ord_1" },
      data: { trackingNumber: "GUIA-9" },
    })
    expect(tx.variant.update).not.toHaveBeenCalled()
  })

  it("aborta si una variante ya no tiene stock suficiente, para no sobrevender", async () => {
    tx.order.findUnique.mockResolvedValue({
      id: "ord_1",
      status: "PENDING",
      items: [{ variantId: "var_1", quantity: 4 }],
    })
    tx.variant.findUnique.mockResolvedValue({ id: "var_1", stock: 1 })

    await expect(markOrderPaidWithStock("ord_1")).rejects.toThrow("Stock insuficiente")
    expect(tx.order.update).not.toHaveBeenCalled()
  })

  it("ignora los ítems sin variante en lugar de reventar", async () => {
    tx.order.findUnique.mockResolvedValue({
      id: "ord_1",
      status: "PENDING",
      items: [{ variantId: null, quantity: 1 }],
    })
    tx.order.update.mockResolvedValue({ id: "ord_1" })

    await markOrderPaidWithStock("ord_1")

    expect(tx.variant.findUnique).not.toHaveBeenCalled()
    expect(tx.order.update).toHaveBeenCalled()
  })

  it("falla si el pedido no existe", async () => {
    tx.order.findUnique.mockResolvedValue(null)

    await expect(markOrderPaidWithStock("ord_1")).rejects.toThrow("Pedido no encontrado")
  })
})

describe("getOrderStats", () => {
  it("suma solo los pedidos pagados y cuenta los pendientes", async () => {
    m.order.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3)
    m.order.aggregate.mockResolvedValue({ _sum: { total: new Prisma.Decimal(1500) } })

    expect(await getOrderStats()).toEqual({
      totalCount: 10,
      pendingCount: 3,
      revenue: 1500,
    })
    expect(m.order.aggregate).toHaveBeenCalledWith({
      _sum: { total: true },
      where: { status: "PAID" },
    })
  })

  it("reporta cero ingresos cuando todavía no hay pedidos pagados", async () => {
    m.order.count.mockResolvedValue(0)
    m.order.aggregate.mockResolvedValue({ _sum: { total: null } })

    expect((await getOrderStats()).revenue).toBe(0)
  })
})
