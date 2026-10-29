import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  addiStatusToPaymentCode,
  buildAddiApplication,
  createAddiApplication,
  verifyAddiCallbackAuth,
} from "../addi-payment.service"
import type { OrderDTO } from "../order.service"

const order = {
  id: "order_123456",
  status: "PENDING",
  paymentStatus: "PENDING",
  total: 265000,
  customerName: "Ana María Pérez",
  customerEmail: "ana@example.com",
  customerDocumentType: "CC",
  customerDocument: "1053000000",
  customerPhone: "+57 300 123 4567",
  shippingAddress: { address: "Cra 23 #65-10", apartment: "Apto 301", city: "Manizales" },
  userId: null,
  items: [
    { id: "i1", productId: "p1", productName: "Tenis X", productImage: null, quantity: 1, unitPrice: 255000, sku: "TX-42" },
  ],
} as unknown as OrderDTO

const ENV_KEYS = [
  "ADDI_AUTH_URL",
  "ADDI_API_URL",
  "ADDI_AUDIENCE",
  "ADDI_CLIENT_ID",
  "ADDI_CLIENT_SECRET",
  "ADDI_CALLBACK_USER",
  "ADDI_CALLBACK_PASSWORD",
]

function configure() {
  process.env.ADDI_AUTH_URL = "https://auth.addi.test"
  process.env.ADDI_API_URL = "https://api.addi.test"
  process.env.ADDI_CLIENT_ID = "client"
  process.env.ADDI_CLIENT_SECRET = "secret"
}

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key]
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("buildAddiApplication", () => {
  it("arma la solicitud con montos en string, envío deducido y URLs del sitio", () => {
    const body = buildAddiApplication(order, "https://tienda.test", "tok.en.sig")
    expect(body.totalAmount).toBe("265000.00")
    expect(body.shippingAmount).toBe("10000.00")
    expect(body.items).toEqual([{ sku: "TX-42", name: "Tenis X", quantity: "1", unitPrice: "255000.00" }])
    expect(body.client).toMatchObject({
      idType: "CC",
      idNumber: "1053000000",
      firstName: "Ana",
      lastName: "María Pérez",
      cellphone: "3001234567",
      address: { lineOne: "Cra 23 #65-10, Apto 301", city: "Manizales", country: "CO" },
    })
    expect(body.allyUrlRedirection.callbackUrl).toBe("https://tienda.test/api/addi/callback")
    expect(body.allyUrlRedirection.redirectionUrl).toBe(
      "https://tienda.test/checkout/success?orderId=order_123456&token=tok.en.sig"
    )
  })
})

describe("addiStatusToPaymentCode", () => {
  it.each([
    ["APPROVED", "1"],
    ["approved", "1"],
    ["REJECTED", "2"],
    ["DECLINED", "2"],
    ["ABANDONED", "2"],
    ["INTERNAL_ERROR", "4"],
    ["PENDING", "3"],
    ["DESCONOCIDO", "3"],
  ])("%s → %s", (status, code) => {
    expect(addiStatusToPaymentCode(status)).toBe(code)
  })
})

describe("verifyAddiCallbackAuth", () => {
  it("falla cerrado sin credenciales configuradas", () => {
    expect(verifyAddiCallbackAuth("Basic abc")).toBeNull()
  })

  it("acepta solo el usuario y la contraseña correctos", () => {
    process.env.ADDI_CALLBACK_USER = "user"
    process.env.ADDI_CALLBACK_PASSWORD = "p@ss!"
    const good = `Basic ${Buffer.from("user:p@ss!").toString("base64")}`
    const bad = `Basic ${Buffer.from("user:otra").toString("base64")}`
    expect(verifyAddiCallbackAuth(good)).toBe(true)
    expect(verifyAddiCallbackAuth(bad)).toBe(false)
    expect(verifyAddiCallbackAuth(null)).toBe(false)
    expect(verifyAddiCallbackAuth("Bearer x")).toBe(false)
  })
})

describe("createAddiApplication", () => {
  const body = buildAddiApplication(order, "https://tienda.test")

  it("no llama a Addi sin credenciales", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    expect(await createAddiApplication(body)).toEqual({ ok: false, reason: "not_configured" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("pide token y devuelve la URL del 301", async () => {
    configure()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "jwt" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "https://checkout.addi.com/x" } }))
    vi.stubGlobal("fetch", fetchMock)

    expect(await createAddiApplication(body)).toEqual({ ok: true, redirectUrl: "https://checkout.addi.com/x" })
    const tokenBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(fetchMock.mock.calls[0][0]).toBe("https://auth.addi.test/oauth/token")
    expect(tokenBody).toMatchObject({ audience: "https://api.addi.test", grant_type: "client_credentials" })
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.addi.test/v1/online-applications")
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer jwt")
  })

  it("reporta 409 como cliente con crédito activo", async () => {
    configure()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "jwt" }), { status: 200 }))
        .mockResolvedValueOnce(new Response("{}", { status: 409 }))
    )
    expect(await createAddiApplication(body)).toEqual({ ok: false, reason: "client_has_credit" })
  })

  it("no sigue si el token falla", async () => {
    configure()
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 }))
    vi.stubGlobal("fetch", fetchMock)
    expect(await createAddiApplication(body)).toEqual({ ok: false, reason: "unavailable" })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rechaza una redirección que no sea https", async () => {
    configure()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "jwt" }), { status: 200 }))
        .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "javascript:alert(1)" } }))
    )
    expect(await createAddiApplication(body)).toEqual({ ok: false, reason: "unavailable" })
  })
})
