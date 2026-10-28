import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}))
vi.mock("@/server/services/order.service", () => ({ placeOrder: vi.fn() }))
vi.mock("@/server/services/abandoned-cart.service", () => ({
  markCartsRecoveredForEmail: vi.fn(),
}))
vi.mock("@/server/services/user.service", () => ({
  getUserById: vi.fn(),
}))
vi.mock("@/server/services/public-rate-limit.service", () => ({
  consumePublicRateLimit: vi.fn(),
}))
vi.mock("@/server/services/guest-order.service", () => ({
  signGuestOrderSuccessToken: vi.fn().mockReturnValue("mock-guest-token-123"),
}))

import { createOrder, type CheckoutData } from "./actions"
import { auth } from "@/lib/auth"
import { placeOrder } from "@/server/services/order.service"
import { markCartsRecoveredForEmail } from "@/server/services/abandoned-cart.service"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"

const validCheckoutData: CheckoutData = {
  email: "cliente@example.com",
  cedula: "1020304050",
  name: "Ana",
  lastName: "Pérez",
  phone: "3001234567",
  address: "Calle 1 # 2-3",
  city: "Bogotá",
  department: "Bogotá D.C.",
  shippingMethod: "standard",
  paymentMethod: "epayco",
  termsAccepted: true,
  items: [
    {
      productId: "product-1",
      variantId: "variant-1",
      sku: "SKU-1",
      name: "Tenis One Star",
      quantity: 1,
      unitPrice: 200_000,
    },
  ],
  subtotal: 200_000,
  shippingCost: 0,
  total: 200_000,
}

describe("createOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(markCartsRecoveredForEmail).mockResolvedValue(undefined)
    vi.mocked(consumePublicRateLimit).mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    })
  })

  it("permite crear un pedido a un invitado sin sesión (userId null) y genera guestToken", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    vi.mocked(placeOrder).mockResolvedValue({
      id: "order-guest-1",
      total: 200_000,
    } as never)

    const result = await createOrder(validCheckoutData)

    expect(result.success).toBe(true)
    expect(result.orderId).toBe("order-guest-1")
    expect(result.epaycoData?.guestToken).toBe("mock-guest-token-123")
    expect(placeOrder).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        customerEmail: "cliente@example.com",
        customerDocument: "1020304050",
      })
    )
  })

  it("bloquea al invitado si excede el límite de intentos por IP", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    vi.mocked(consumePublicRateLimit).mockImplementation(async (bucket) => {
      if (bucket === "guest_order_ip") {
        return { allowed: false, retryAfterSeconds: 3600 }
      }
      return { allowed: true, retryAfterSeconds: 0 }
    })

    const result = await createOrder(validCheckoutData)

    expect(result.success).toBe(false)
    expect(result.code).toBe("ORDER_ERROR")
    expect(result.error).toMatch(/conexión/i)
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("bloquea al invitado si excede el límite de intentos por email", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    vi.mocked(consumePublicRateLimit).mockImplementation(async (bucket) => {
      if (bucket === "guest_order_email") {
        return { allowed: false, retryAfterSeconds: 3600 }
      }
      return { allowed: true, retryAfterSeconds: 0 }
    })

    const result = await createOrder(validCheckoutData)

    expect(result.success).toBe(false)
    expect(result.code).toBe("ORDER_ERROR")
    expect(result.error).toMatch(/correo/i)
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("usa el ID de la sesión customer al crear el pedido cuando hay sesión", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "customer-1", userType: "customer" },
      session: {},
    } as never)
    vi.mocked(placeOrder).mockResolvedValue({
      id: "order-1",
      total: 200_000,
    } as never)

    const result = await createOrder(validCheckoutData)

    expect(result).toMatchObject({ success: true, orderId: "order-1" })
    expect(result.epaycoData?.guestToken).toBeUndefined()
    expect(placeOrder).toHaveBeenCalledWith("customer-1", expect.any(Object))
    // No aplica rate limiting a usuarios con sesión
    expect(consumePublicRateLimit).not.toHaveBeenCalled()
  })

  it("trata la sesión no-customer (admin) como invitado (userId null)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "admin-1", userType: "admin" },
      session: {},
    } as never)
    vi.mocked(placeOrder).mockResolvedValue({
      id: "order-2",
      total: 200_000,
    } as never)

    const result = await createOrder(validCheckoutData)

    expect(result.success).toBe(true)
    expect(placeOrder).toHaveBeenCalledWith(null, expect.any(Object))
  })

  it("valida el payload rechazando datos inválidos o incompletos", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = await createOrder({ ...validCheckoutData, email: "correo-invalido" })

    expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("rechaza el pedido si no se han aceptado los términos", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = await createOrder({ ...validCheckoutData, termsAccepted: false })

    expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
    expect(placeOrder).not.toHaveBeenCalled()
  })
})
