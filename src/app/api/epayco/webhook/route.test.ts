import { beforeEach, describe, expect, it, vi } from "vitest"
import * as crypto from "crypto"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ applyPaymentNotification: vi.fn() }))

vi.mock("@/server/services/payment.service", () => ({
  applyPaymentNotification: mocks.applyPaymentNotification,
}))

import { GET, POST } from "./route"
import type { NextRequest } from "next/server"

const CUSTOMER_ID = "123456"
const PRIVATE_KEY = "clave-privada"

function sign(fields: Record<string, string>): string {
  return crypto
    .createHash("sha256")
    .update(
      `${CUSTOMER_ID}^${PRIVATE_KEY}^${fields.x_ref_payco}^${fields.x_transaction_id}^${fields.x_amount}^${fields.x_currency_code}`
    )
    .digest("hex")
}

/** Formulario tal como lo envía ePayco a la URL de confirmación. */
function epaycoForm(overrides: Record<string, string> = {}): Record<string, string> {
  const fields: Record<string, string> = {
    x_ref_payco: "987654321",
    x_transaction_id: "tx-1",
    x_amount: "150000.00",
    x_currency_code: "COP",
    x_cod_response: "1",
    x_transaction_state: "Aceptada",
    x_id_invoice: "order-abc",
    ...overrides,
  }
  return { ...fields, x_signature: fields.x_signature ?? sign(fields) }
}

function request(fields: Record<string, string>): NextRequest {
  const body = new URLSearchParams(fields)
  return new Request("http://localhost/api/epayco/webhook", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  }) as unknown as NextRequest
}

describe("POST /api/epayco/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("EPAYCO_CUSTOMER_ID", CUSTOMER_ID)
    vi.stubEnv("EPAYCO_PRIVATE_KEY", PRIVATE_KEY)
    vi.stubEnv("NODE_ENV", "test")
    mocks.applyPaymentNotification.mockResolvedValue({ outcome: "paid", order: { id: "order-abc" } })
  })

  it("acepta el formulario real de ePayco (x_id_invoice) y aplica el pago", async () => {
    const response = await POST(request(epaycoForm()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true, outcome: "paid" })
    expect(mocks.applyPaymentNotification).toHaveBeenCalledWith({
      orderId: "order-abc",
      refPayco: "987654321",
      amount: "150000.00",
      codResponse: "1",
    })
  })

  it("responde 400 si no llega la factura", async () => {
    const fields = epaycoForm()
    delete (fields as Record<string, string>).x_id_invoice

    const response = await POST(request(fields))

    expect(response.status).toBe(400)
    expect(mocks.applyPaymentNotification).not.toHaveBeenCalled()
  })

  it("rechaza con 401 una firma inválida", async () => {
    const response = await POST(request(epaycoForm({ x_signature: "0".repeat(64) })))

    expect(response.status).toBe(401)
    expect(mocks.applyPaymentNotification).not.toHaveBeenCalled()
  })

  it("responde 404 si el pedido no existe", async () => {
    mocks.applyPaymentNotification.mockResolvedValue({ outcome: "order_not_found", order: null })

    const response = await POST(request(epaycoForm()))

    expect(response.status).toBe(404)
  })

  it("responde 200 en desenlaces que no deben reintentarse", async () => {
    mocks.applyPaymentNotification.mockResolvedValue({ outcome: "amount_mismatch", order: {} })

    const response = await POST(request(epaycoForm()))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ outcome: "amount_mismatch" })
  })

  it("falla cerrado sin credenciales fuera del modo de pruebas", async () => {
    vi.stubEnv("EPAYCO_CUSTOMER_ID", "")
    vi.stubEnv("EPAYCO_PRIVATE_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_EPAYCO_TEST", "false")
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(request(epaycoForm()))

    expect(response.status).toBe(503)
  })

  it("responde 500 si el servicio de pagos lanza", async () => {
    mocks.applyPaymentNotification.mockRejectedValue(new Error("db caída"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(request(epaycoForm()))

    expect(response.status).toBe(500)
  })
})

describe("GET /api/epayco/webhook", () => {
  it("responde ok para la verificación de disponibilidad", async () => {
    const response = await GET()
    await expect(response.json()).resolves.toEqual({ status: "ok" })
  })
})
