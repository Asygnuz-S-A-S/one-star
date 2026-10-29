import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrderById: vi.fn(),
  verifyGuestOrderSuccessToken: vi.fn(),
  createAddiApplication: vi.fn(),
  updateOrderPaymentMethod: vi.fn(),
}))

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }))
vi.mock("@/server/services/order.service", () => ({ getOrderById: mocks.getOrderById }))
vi.mock("@/server/services/guest-order.service", () => ({
  verifyGuestOrderSuccessToken: mocks.verifyGuestOrderSuccessToken,
}))
vi.mock("@/server/services/addi-config.service", () => ({ getAddiWidgetEvaluation: vi.fn() }))
vi.mock("@/server/services/addi-payment.service", () => ({
  buildAddiApplication: vi.fn(() => ({ orderId: "order_1" })),
  createAddiApplication: mocks.createAddiApplication,
}))
vi.mock("@/server/repositories/order.repository", () => ({
  updateOrderPaymentMethod: mocks.updateOrderPaymentMethod,
}))

import { startAddiPaymentAction } from "../addi.actions"

const pendingOrder = {
  id: "order_1",
  status: "PENDING",
  paymentStatus: "PENDING",
  customerDocumentType: "CC",
  userId: "user_1",
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getOrderById.mockResolvedValue(pendingOrder)
  mocks.getSession.mockResolvedValue({ user: { id: "user_1" } })
  mocks.verifyGuestOrderSuccessToken.mockReturnValue(null)
  mocks.createAddiApplication.mockResolvedValue({ ok: true, redirectUrl: "https://checkout.addi.com/x" })
})

describe("startAddiPaymentAction", () => {
  it("la cuenta dueña recibe la URL de Addi y el pedido queda con método addi", async () => {
    expect(await startAddiPaymentAction({ orderId: "order_1" })).toEqual({
      success: true,
      redirectUrl: "https://checkout.addi.com/x",
    })
    expect(mocks.updateOrderPaymentMethod).toHaveBeenCalledWith("order_1", "addi")
  })

  it("el invitado con token válido de su pedido puede pagar", async () => {
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, userId: null })
    mocks.verifyGuestOrderSuccessToken.mockReturnValue({ orderId: "order_1" })
    expect((await startAddiPaymentAction({ orderId: "order_1", guestToken: "t" })).success).toBe(true)
  })

  it("otra cuenta no puede iniciar el pago de un pedido ajeno", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "user_2" } })
    expect((await startAddiPaymentAction({ orderId: "order_1" })).success).toBe(false)
    expect(mocks.createAddiApplication).not.toHaveBeenCalled()
  })

  it("un token de invitado de otro pedido no sirve", async () => {
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, userId: null })
    mocks.verifyGuestOrderSuccessToken.mockReturnValue({ orderId: "order_otro" })
    expect((await startAddiPaymentAction({ orderId: "order_1", guestToken: "t" })).success).toBe(false)
    expect(mocks.createAddiApplication).not.toHaveBeenCalled()
  })

  it("un pedido ya pagado no se vuelve a cobrar", async () => {
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, status: "PAID", paymentStatus: "APPROVED" })
    expect(await startAddiPaymentAction({ orderId: "order_1" })).toEqual({
      success: false,
      error: "Este pedido ya no está pendiente de pago.",
    })
    expect(mocks.createAddiApplication).not.toHaveBeenCalled()
  })

  it("Addi solo acepta cédula de ciudadanía", async () => {
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, customerDocumentType: "CE" })
    expect((await startAddiPaymentAction({ orderId: "order_1" })).success).toBe(false)
    expect(mocks.createAddiApplication).not.toHaveBeenCalled()
  })

  it("cliente con crédito activo (409) recibe el mensaje de usar otro medio", async () => {
    mocks.createAddiApplication.mockResolvedValue({ ok: false, reason: "client_has_credit" })
    const result = await startAddiPaymentAction({ orderId: "order_1" })
    expect(result).toMatchObject({ success: false })
    expect(!result.success && result.error).toContain("crédito activo")
    expect(mocks.updateOrderPaymentMethod).not.toHaveBeenCalled()
  })
})
