import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const deps = vi.hoisted(() => ({
  findOrdersByShortNumber: vi.fn(),
  consumeRequestRateLimit: vi.fn(),
}))

vi.mock("@/server/repositories/order.repository", () => ({ findOrdersByShortNumber: deps.findOrdersByShortNumber }))
vi.mock("@/server/repositories/request-rate-limit.repository", () => ({ consumeRequestRateLimit: deps.consumeRequestRateLimit }))
vi.mock("@/server/services/admin-recovery.service", () => ({ extractTrustedClientIp: () => "1.2.3.4" }))
vi.mock("@/server/services/order.service", () => ({
  orderTrackingUrl: (o: { trackingNumber: string | null; carrier?: string | null }) =>
    o.trackingNumber && o.carrier !== "OTHER" ? `https://envia.co/rastreo?guia=${o.trackingNumber}` : null,
}))

import { ORDER_NOT_FOUND_MESSAGE, trackOrder } from "../order-tracking.service"
import { orderTrackingSchema } from "@/server/validators/order-tracking.validator"

const order = {
  id: "cmw5gvq6v0001jshco823f4ty",
  status: "SHIPPED",
  paymentStatus: "APPROVED",
  createdAt: new Date("2026-11-06T15:00:00Z"),
  paidAt: new Date("2026-11-06T15:05:00Z"),
  shippedAt: new Date("2026-11-07T14:00:00Z"),
  readyForPickupAt: null,
  deliveredAt: null,
  total: "429900.00",
  customerEmail: "Ana@Mail.com",
  user: null,
  carrier: "ENVIA",
  trackingNumber: "ENV-123",
  shippingAddress: { address: "Calle 10 #20-30", phone: "3001234567" },
  customerPhone: "3001234567",
  customerDocument: "1000000001",
  items: [{ quantity: 1, product: { name: "Adidas Superstar" }, variant: { size: "38" } }],
}

beforeEach(() => {
  vi.clearAllMocks()
  deps.consumeRequestRateLimit.mockResolvedValue({ count: 1 })
})

describe("trackOrder", () => {
  it("devuelve el estado y la guía cuando el número y el correo coinciden", async () => {
    deps.findOrdersByShortNumber.mockResolvedValue([order])

    const result = await trackOrder("O823F4TY", "ana@mail.com", new Headers())

    expect(deps.findOrdersByShortNumber).toHaveBeenCalledWith("O823F4TY")
    expect(result).toEqual({
      success: true,
      order: {
        number: "O823F4TY",
        status: "SHIPPED",
        paymentStatus: "APPROVED",
        createdAt: "2026-11-06T15:00:00.000Z",
        paidAt: "2026-11-06T15:05:00.000Z",
        shippedAt: "2026-11-07T14:00:00.000Z",
        readyForPickupAt: null,
        deliveredAt: null,
        shippingAddress: { shippingMethod: null, pickupStoreName: null },
        total: 429900,
        items: [{ name: "Adidas Superstar", size: "38", quantity: 1 }],
        carrier: "ENVIA",
        trackingNumber: "ENV-123",
        trackingUrl: "https://envia.co/rastreo?guia=ENV-123",
      },
    })
  })

  it("no expone dirección, teléfono ni documento", async () => {
    deps.findOrdersByShortNumber.mockResolvedValue([order])
    const result = await trackOrder("O823F4TY", "ana@mail.com", new Headers())
    const text = JSON.stringify(result)
    expect(text).not.toContain("Calle 10")
    expect(text).not.toContain("3001234567")
    expect(text).not.toContain("1000000001")
  })

  it("usa el correo de la cuenta cuando el pedido no guardó uno", async () => {
    deps.findOrdersByShortNumber.mockResolvedValue([{ ...order, customerEmail: null, user: { email: "ana@mail.com" } }])
    const result = await trackOrder("O823F4TY", "ana@mail.com", new Headers())
    expect(result.success).toBe(true)
  })

  it("responde lo mismo si el correo no coincide o el pedido no existe", async () => {
    deps.findOrdersByShortNumber.mockResolvedValue([order])
    const wrongEmail = await trackOrder("O823F4TY", "otra@mail.com", new Headers())
    deps.findOrdersByShortNumber.mockResolvedValue([])
    const missing = await trackOrder("ZZZZZZZZ", "ana@mail.com", new Headers())
    expect(wrongEmail).toEqual({ success: false, error: ORDER_NOT_FOUND_MESSAGE })
    expect(missing).toEqual(wrongEmail)
  })

  it("no busca cuando se superan los intentos", async () => {
    deps.consumeRequestRateLimit.mockResolvedValue({ count: 11 })
    const result = await trackOrder("O823F4TY", "ana@mail.com", new Headers())
    expect(result.success).toBe(false)
    expect(deps.findOrdersByShortNumber).not.toHaveBeenCalled()
  })
})

describe("orderTrackingSchema", () => {
  it("acepta el número con #, OS- o minúsculas", () => {
    for (const value of ["#O823F4TY", "os-o823f4ty", " o823f4ty "]) {
      expect(orderTrackingSchema.parse({ orderNumber: value, email: "Ana@Mail.com" })).toEqual({
        orderNumber: "O823F4TY",
        email: "ana@mail.com",
      })
    }
  })

  it("rechaza números que no tienen 8 caracteres", () => {
    expect(orderTrackingSchema.safeParse({ orderNumber: "#123", email: "ana@mail.com" }).success).toBe(false)
  })
})
