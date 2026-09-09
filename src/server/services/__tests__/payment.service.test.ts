import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  changeOrderStatus: vi.fn(),
  closeOrderWithoutPayment: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  updateOrderPaymentReference: vi.fn(),
  sendMetaPurchaseForOrder: vi.fn(),
  fetchEpaycoTransaction: vi.fn(),
}))

vi.mock("@/server/services/order.service", () => ({
  getOrderById: mocks.getOrderById,
  changeOrderStatus: mocks.changeOrderStatus,
  closeOrderWithoutPayment: mocks.closeOrderWithoutPayment,
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}))
vi.mock("@/server/repositories/order.repository", () => ({
  updateOrderPaymentReference: mocks.updateOrderPaymentReference,
}))
vi.mock("@/server/services/meta-conversions.service", () => ({
  sendMetaPurchaseForOrder: mocks.sendMetaPurchaseForOrder,
}))
vi.mock("@/server/services/epayco.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/services/epayco.service")>()
  return { ...original, fetchEpaycoTransaction: mocks.fetchEpaycoTransaction }
})

import { applyPaymentNotification, confirmPaymentByReference } from "../payment.service"

const pendingOrder = {
  id: "order-1",
  status: "PENDING",
  paymentStatus: "PENDING",
  paymentReference: null,
  paidAt: null,
  total: 150000,
  customerEmail: "cliente@example.com",
  items: [],
}

const paidOrder = {
  ...pendingOrder,
  status: "PAID",
  paymentStatus: "APPROVED",
  paymentReference: "ref-1",
  paidAt: "2026-09-07T00:00:00.000Z",
}

const accepted = { orderId: "order-1", refPayco: "ref-1", amount: "150000.00", codResponse: "1" }

/** Deja resolver las promesas fire-and-forget encoladas por el servicio. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("applyPaymentNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendOrderConfirmation.mockResolvedValue(undefined)
    mocks.sendMetaPurchaseForOrder.mockResolvedValue({ sent: true })
    mocks.updateOrderPaymentReference.mockResolvedValue({})
    mocks.changeOrderStatus.mockResolvedValue(undefined)
    mocks.closeOrderWithoutPayment.mockResolvedValue(true)
  })

  it("responde order_not_found sin tocar nada cuando el pedido no existe", async () => {
    mocks.getOrderById.mockResolvedValue(null)

    const result = await applyPaymentNotification(accepted)

    expect(result).toEqual({ outcome: "order_not_found", order: null })
    expect(mocks.updateOrderPaymentReference).not.toHaveBeenCalled()
  })

  it("guarda la referencia de ePayco cuando cambia", async () => {
    mocks.getOrderById.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(paidOrder)

    await applyPaymentNotification(accepted)

    expect(mocks.updateOrderPaymentReference).toHaveBeenCalledWith("order-1", "ref-1")
  })

  it("no reescribe la referencia si ya es la misma", async () => {
    mocks.getOrderById.mockResolvedValue(paidOrder)

    await applyPaymentNotification(accepted)

    expect(mocks.updateOrderPaymentReference).not.toHaveBeenCalled()
  })

  it("pago aceptado: marca PAID, envía el correo y el Purchase a Meta", async () => {
    mocks.getOrderById.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(paidOrder)

    const result = await applyPaymentNotification(accepted)
    await flush()

    expect(mocks.changeOrderStatus).toHaveBeenCalledWith("order-1", "PAID")
    expect(result.outcome).toBe("paid")
    expect(result.order).toEqual(paidOrder)
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith(paidOrder)
    expect(mocks.sendMetaPurchaseForOrder).toHaveBeenCalledWith(paidOrder)
  })

  it("un fallo del correo o de Meta no rompe la confirmación", async () => {
    mocks.getOrderById.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(paidOrder)
    mocks.sendOrderConfirmation.mockRejectedValue(new Error("resend caído"))
    mocks.sendMetaPurchaseForOrder.mockRejectedValue(new Error("meta caído"))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await applyPaymentNotification(accepted)
    await flush()

    expect(result.outcome).toBe("paid")
    expect(errorSpy).toHaveBeenCalledTimes(2)
    errorSpy.mockRestore()
  })

  it("pago aceptado sobre un pedido ya pagado es idempotente", async () => {
    mocks.getOrderById.mockResolvedValue(paidOrder)

    const result = await applyPaymentNotification(accepted)
    await flush()

    expect(result.outcome).toBe("already_paid")
    expect(mocks.changeOrderStatus).not.toHaveBeenCalled()
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled()
  })

  it("tolera diferencias de centavos en el monto", async () => {
    mocks.getOrderById.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(paidOrder)

    const result = await applyPaymentNotification({ ...accepted, amount: "150000.005" })

    expect(result.outcome).toBe("paid")
  })

  it("monto distinto: deja el pedido PENDING para revisión manual", async () => {
    mocks.getOrderById.mockResolvedValue(pendingOrder)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await applyPaymentNotification({ ...accepted, amount: "1000" })

    expect(result.outcome).toBe("amount_mismatch")
    expect(mocks.changeOrderStatus).not.toHaveBeenCalled()
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("monto no numérico también se trata como discrepancia", async () => {
    mocks.getOrderById.mockResolvedValue(pendingOrder)
    vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await applyPaymentNotification({ ...accepted, amount: "abc" })

    expect(result.outcome).toBe("amount_mismatch")
  })

  it("rechazo (2): cierra el pedido como REJECTED", async () => {
    const rejected = { ...pendingOrder, status: "CANCELLED", paymentStatus: "REJECTED" }
    mocks.getOrderById.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(rejected)

    const result = await applyPaymentNotification({ ...accepted, codResponse: "2" })

    expect(mocks.closeOrderWithoutPayment).toHaveBeenCalledWith("order-1", "REJECTED")
    expect(result.outcome).toBe("rejected")
    expect(result.order).toEqual(rejected)
  })

  it("fallo (4): cierra el pedido como FAILED", async () => {
    mocks.getOrderById.mockResolvedValue(pendingOrder)

    await applyPaymentNotification({ ...accepted, codResponse: "4" })

    expect(mocks.closeOrderWithoutPayment).toHaveBeenCalledWith("order-1", "FAILED")
  })

  it("un rechazo tardío nunca cancela un pedido ya pagado", async () => {
    mocks.getOrderById.mockResolvedValue(paidOrder)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await applyPaymentNotification({ ...accepted, codResponse: "2" })

    expect(result.outcome).toBe("ignored_rejection")
    expect(mocks.closeOrderWithoutPayment).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it("un rechazo repetido sobre un pedido ya cancelado no reprocesa", async () => {
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, status: "CANCELLED", paymentStatus: "REJECTED" })

    const result = await applyPaymentNotification({ ...accepted, codResponse: "2" })

    expect(result.outcome).toBe("already_cancelled")
    expect(mocks.closeOrderWithoutPayment).not.toHaveBeenCalled()
  })

  it("pendiente (3): no cambia el pedido", async () => {
    mocks.getOrderById.mockResolvedValue(pendingOrder)

    const result = await applyPaymentNotification({ ...accepted, codResponse: "3" })

    expect(result.outcome).toBe("pending")
    expect(mocks.changeOrderStatus).not.toHaveBeenCalled()
    expect(mocks.closeOrderWithoutPayment).not.toHaveBeenCalled()
  })
})

describe("confirmPaymentByReference", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendOrderConfirmation.mockResolvedValue(undefined)
    mocks.sendMetaPurchaseForOrder.mockResolvedValue({ sent: true })
    mocks.updateOrderPaymentReference.mockResolvedValue({})
    mocks.changeOrderStatus.mockResolvedValue(undefined)
  })

  const transaction = {
    refPayco: "ref-1",
    transactionId: "tx-1",
    invoice: "order-1",
    amount: "150000",
    currencyCode: "COP",
    codResponse: "1",
    transactionState: "Aceptada",
  }

  it("consulta a ePayco y aplica el resultado al pedido", async () => {
    mocks.fetchEpaycoTransaction.mockResolvedValue(transaction)
    mocks.getOrderById.mockResolvedValueOnce(pendingOrder).mockResolvedValueOnce(paidOrder)

    const result = await confirmPaymentByReference("ref-1")

    expect(mocks.fetchEpaycoTransaction).toHaveBeenCalledWith("ref-1")
    expect(mocks.changeOrderStatus).toHaveBeenCalledWith("order-1", "PAID")
    expect(result).toEqual({ status: "approved", order: { id: "order-1", total: 150000 } })
  })

  it("devuelve unknown si ePayco no responde", async () => {
    mocks.fetchEpaycoTransaction.mockResolvedValue(null)

    const result = await confirmPaymentByReference("ref-1")

    expect(result).toEqual({ status: "unknown", order: null })
    expect(mocks.getOrderById).not.toHaveBeenCalled()
  })

  it("rechaza una referencia que pertenece a otro pedido", async () => {
    mocks.fetchEpaycoTransaction.mockResolvedValue(transaction)
    vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await confirmPaymentByReference("ref-1", "order-OTRO")

    expect(result.status).toBe("unknown")
    expect(mocks.getOrderById).not.toHaveBeenCalled()
  })

  it("mapea un rechazo a rejected", async () => {
    mocks.fetchEpaycoTransaction.mockResolvedValue({ ...transaction, codResponse: "2" })
    mocks.getOrderById.mockResolvedValue(pendingOrder)
    mocks.closeOrderWithoutPayment.mockResolvedValue(true)

    const result = await confirmPaymentByReference("ref-1", "order-1")

    expect(result.status).toBe("rejected")
  })

  it("mapea pendiente y discrepancia de monto a pending", async () => {
    mocks.fetchEpaycoTransaction.mockResolvedValue({ ...transaction, codResponse: "3" })
    mocks.getOrderById.mockResolvedValue(pendingOrder)

    expect((await confirmPaymentByReference("ref-1")).status).toBe("pending")

    mocks.fetchEpaycoTransaction.mockResolvedValue({ ...transaction, amount: "1" })
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await confirmPaymentByReference("ref-1")).status).toBe("pending")
  })
})

describe("applyPaymentNotification — aprobación tardía", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateOrderPaymentReference.mockResolvedValue({})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("no resucita un pedido ya cancelado: lo deja para revisión manual", async () => {
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, status: "CANCELLED", paymentStatus: "EXPIRED" })

    const result = await applyPaymentNotification(accepted)

    expect(result.outcome).toBe("late_approval")
    expect(mocks.changeOrderStatus).not.toHaveBeenCalled()
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled()
    // La referencia sí se guarda para que el admin pueda conciliar el cobro.
    expect(mocks.updateOrderPaymentReference).toHaveBeenCalledWith("order-1", "ref-1")
  })

  it("el cliente ve la aprobación tardía como pago en proceso", async () => {
    mocks.fetchEpaycoTransaction.mockResolvedValue({
      refPayco: "ref-1",
      transactionId: "tx-1",
      invoice: "order-1",
      amount: "150000",
      currencyCode: "COP",
      codResponse: "1",
      transactionState: "Aceptada",
    })
    mocks.getOrderById.mockResolvedValue({ ...pendingOrder, status: "CANCELLED", paymentStatus: "EXPIRED" })

    expect((await confirmPaymentByReference("ref-1")).status).toBe("pending")
  })
})
