import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ applyPaymentNotification: vi.fn() }))

vi.mock("@/server/services/payment.service", () => ({
  applyPaymentNotification: mocks.applyPaymentNotification,
}))

import { POST } from "./route"

const AUTH = `Basic ${Buffer.from("notif:clave").toString("base64")}`

const payload = {
  orderId: "order_123456",
  applicationId: "app-1",
  approvedAmount: "265000.00",
  currency: "COP",
  status: "APPROVED",
  statusTimestamp: 1761800000,
}

function request(body: unknown, authorization: string | null = AUTH): Request {
  return new Request("https://tienda.test/api/addi/callback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(authorization ? { authorization } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADDI_CALLBACK_USER = "notif"
  process.env.ADDI_CALLBACK_PASSWORD = "clave"
  mocks.applyPaymentNotification.mockResolvedValue({ outcome: "paid", order: { id: payload.orderId } })
})

describe("POST /api/addi/callback", () => {
  it("aprobado: aplica el pago y devuelve el mismo JSON", async () => {
    const response = await POST(request(payload))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(payload)
    expect(mocks.applyPaymentNotification).toHaveBeenCalledWith({
      orderId: "order_123456",
      refPayco: "app-1",
      amount: "265000.00",
      codResponse: "1",
    })
  })

  it("rechazado: cierra el pedido con el código de rechazo", async () => {
    mocks.applyPaymentNotification.mockResolvedValue({ outcome: "rejected", order: null })
    const response = await POST(request({ ...payload, status: "REJECTED", approvedAmount: "0" }))
    expect(response.status).toBe(200)
    expect(mocks.applyPaymentNotification).toHaveBeenCalledWith(expect.objectContaining({ codResponse: "2" }))
  })

  it("sin credenciales configuradas responde 503 y no toca el pedido", async () => {
    delete process.env.ADDI_CALLBACK_PASSWORD
    const response = await POST(request(payload))
    expect(response.status).toBe(503)
    expect(mocks.applyPaymentNotification).not.toHaveBeenCalled()
  })

  it("con credenciales malas o sin ellas responde 401", async () => {
    const wrong = `Basic ${Buffer.from("notif:otra").toString("base64")}`
    expect((await POST(request(payload, wrong))).status).toBe(401)
    expect((await POST(request(payload, null))).status).toBe(401)
    expect(mocks.applyPaymentNotification).not.toHaveBeenCalled()
  })

  it("JSON inválido o incompleto responde 400", async () => {
    expect((await POST(request("no-json"))).status).toBe(400)
    expect((await POST(request({ orderId: "x" }))).status).toBe(400)
    expect(mocks.applyPaymentNotification).not.toHaveBeenCalled()
  })

  it("pedido inexistente responde 404", async () => {
    mocks.applyPaymentNotification.mockResolvedValue({ outcome: "order_not_found", order: null })
    expect((await POST(request(payload))).status).toBe(404)
  })
})
