import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))

const mocks = vi.hoisted(() => ({
  confirmPaymentByReference: vi.fn(),
  getOrderById: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }))
vi.mock("@/server/services/payment.service", () => ({
  confirmPaymentByReference: mocks.confirmPaymentByReference,
}))
vi.mock("@/server/services/order.service", () => ({
  getOrderById: mocks.getOrderById,
}))

import { checkPaymentStatus } from "./actions"

const ownOrder = { id: "order-1", total: 150000, paymentStatus: "APPROVED", userId: "user-1" }

describe("checkPaymentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ user: { id: "user-1", userType: "customer" } })
    mocks.confirmPaymentByReference.mockResolvedValue({ status: "unknown", order: null })
  })

  it("confirma contra ePayco cuando llega ref_payco y devuelve el pedido del dueño", async () => {
    mocks.confirmPaymentByReference.mockResolvedValue({
      status: "approved",
      order: { id: "order-1", total: 150000 },
    })
    mocks.getOrderById.mockResolvedValue(ownOrder)

    const result = await checkPaymentStatus({ refPayco: "987654321", orderId: "order-1" })

    expect(mocks.confirmPaymentByReference).toHaveBeenCalledWith("987654321", "order-1")
    expect(result).toEqual({ status: "approved", orderId: "order-1", total: 150000 })
  })

  it("cae al estado guardado del pedido si ePayco no responde", async () => {
    mocks.getOrderById.mockResolvedValue({ ...ownOrder, total: 99000 })

    const result = await checkPaymentStatus({ refPayco: "987654321", orderId: "order-1" })

    expect(result).toEqual({ status: "approved", orderId: "order-1", total: 99000 })
  })

  it("mapea el estado guardado: rechazado/fallido/vencido → rejected, resto → pending", async () => {
    mocks.getOrderById.mockResolvedValueOnce({ ...ownOrder, paymentStatus: "EXPIRED" })
    expect((await checkPaymentStatus({ orderId: "order-1" })).status).toBe("rejected")

    mocks.getOrderById.mockResolvedValueOnce({ ...ownOrder, paymentStatus: "PENDING" })
    expect((await checkPaymentStatus({ orderId: "order-1" })).status).toBe("pending")
  })

  it("no revela datos de un pedido ajeno", async () => {
    mocks.getOrderById.mockResolvedValue({ ...ownOrder, userId: "otro-usuario" })

    const result = await checkPaymentStatus({ orderId: "order-1" })

    expect(result).toEqual({ status: "unknown", orderId: "order-1", total: null })
  })

  it("no revela datos sin sesión", async () => {
    mocks.getSession.mockResolvedValue(null)
    mocks.getOrderById.mockResolvedValue(ownOrder)

    const result = await checkPaymentStatus({ orderId: "order-1" })

    expect(result.status).toBe("unknown")
    expect(result.total).toBeNull()
  })

  it("devuelve unknown sin parámetros válidos y sin consultar nada", async () => {
    const result = await checkPaymentStatus({ refPayco: "../x", orderId: "" })

    expect(result).toEqual({ status: "unknown", orderId: null, total: null })
    expect(mocks.confirmPaymentByReference).not.toHaveBeenCalled()
    expect(mocks.getOrderById).not.toHaveBeenCalled()
  })

  it("devuelve unknown con el orderId si el pedido no existe", async () => {
    mocks.getOrderById.mockResolvedValue(null)

    const result = await checkPaymentStatus({ orderId: "order-xyz" })

    expect(result).toEqual({ status: "unknown", orderId: "order-xyz", total: null })
  })
})
