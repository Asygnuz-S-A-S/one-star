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
      update: vi.fn().mockResolvedValue({ id: "customer-1" }),
    },
  },
}))
vi.mock("@/server/services/order.service", () => ({ placeOrder: vi.fn(), getOrderById: vi.fn(), cancelUnpaidOrder: vi.fn() }))
vi.mock("@/server/repositories/order.repository", () => ({ extendStockReservation: vi.fn() }))
vi.mock("@/server/services/abandoned-cart.service", () => ({
  markCartsRecoveredForEmail: vi.fn(),
}))
vi.mock("@/server/services/user.service", () => ({
  getUserById: vi.fn(),
}))
vi.mock("@/server/services/public-rate-limit.service", () => ({
  consumePublicRateLimit: vi.fn(),
}))
vi.mock("@/server/services/store.service", () => ({
  getPickupStores: vi.fn().mockResolvedValue([{ id: "store-fundadores", name: "One Star Fundadores", address: "C.C. Fundadores, local 158", city: "Manizales", department: "Caldas" }]),
}))
vi.mock("@/server/services/guest-order.service", () => ({
  signGuestOrderSuccessToken: vi.fn().mockReturnValue("mock-guest-token-123"),
  verifyGuestOrderSuccessToken: vi.fn((token?: string) => (token === "token-bueno" ? { orderId: "order-1" } : null)),
}))

import { abandonCheckoutOrder, createOrder, holdStockWhilePaying, type CheckoutData } from "./actions"
import { cancelUnpaidOrder, getOrderById } from "@/server/services/order.service"
import { extendStockReservation } from "@/server/repositories/order.repository"
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
    // Con sesión solo aplica el límite por cuenta, no los de invitado
    expect(consumePublicRateLimit).toHaveBeenCalledTimes(1)
    expect(consumePublicRateLimit).toHaveBeenCalledWith(
      "customer_order",
      expect.anything(),
      expect.objectContaining({ subject: "customer-1" })
    )
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

  it("permite la compra sin consentimiento de marketing (casilla separada y opcional)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    vi.mocked(placeOrder).mockResolvedValue({ id: "order-no-mkt", total: 200_000 } as never)

    const result = await createOrder({ ...validCheckoutData, marketingConsent: false })

    expect(result.success).toBe(true)
    expect(placeOrder).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        marketingConsentAt: null,
        marketingConsentVersion: null,
      })
    )
  })

  it("registra marketingConsentAt y versión cuando el usuario lo autoriza", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    vi.mocked(placeOrder).mockResolvedValue({ id: "order-with-mkt", total: 200_000 } as never)

    const result = await createOrder({
      ...validCheckoutData,
      marketingConsent: true,
      marketingConsentVersion: "v2.0",
    })

    expect(result.success).toBe(true)
    expect(placeOrder).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        marketingConsentAt: expect.any(Date),
        marketingConsentVersion: "v2.0",
      })
    )
  })

  it("recoger en tienda: el pedido lleva la dirección de la tienda, no la del cliente", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    vi.mocked(placeOrder).mockResolvedValue({ id: "order-pickup-1", total: 200_000 } as never)

    const result = await createOrder({ ...validCheckoutData, shippingMethod: "pickup", pickupStoreId: "store-fundadores", address: "", city: "", department: "" })

    expect(result.success).toBe(true)
    expect(result.epaycoData?.address).toBe("C.C. Fundadores, local 158")
    expect(placeOrder).toHaveBeenCalledWith(null, expect.objectContaining({
      shippingMethod: "pickup",
      shippingAddress: expect.objectContaining({ address: "C.C. Fundadores, local 158", city: "Manizales", department: "Caldas", pickupStoreId: "store-fundadores", pickupStoreName: "One Star Fundadores" }),
    }))
  })

  it("recoger en tienda: rechaza una tienda que no existe o está inactiva", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    const result = await createOrder({ ...validCheckoutData, shippingMethod: "pickup", pickupStoreId: "store-cerrada" })
    expect(result).toEqual(expect.objectContaining({ success: false, error: "La tienda elegida no está disponible. Elige otra." }))
    expect(placeOrder).not.toHaveBeenCalled()
  })
})

describe("reserva del pedido en el checkout", () => {
  const guestOrder = { id: "order-1", userId: null, status: "PENDING", paymentStatus: "PENDING", paymentReference: null }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never)
  })

  it("el invitado con su token puede soltar su pedido", async () => {
    vi.mocked(getOrderById).mockResolvedValue(guestOrder as never)
    await abandonCheckoutOrder({ orderId: "order-1", guestToken: "token-bueno" })
    expect(cancelUnpaidOrder).toHaveBeenCalledWith("order-1")
  })

  it("sin token válido no se toca un pedido ajeno", async () => {
    vi.mocked(getOrderById).mockResolvedValue(guestOrder as never)
    await abandonCheckoutOrder({ orderId: "order-1", guestToken: "otro" })
    await holdStockWhilePaying({ orderId: "order-1" })
    expect(cancelUnpaidOrder).not.toHaveBeenCalled()
    expect(extendStockReservation).not.toHaveBeenCalled()
  })

  it("una cuenta no puede soltar el pedido de otra", async () => {
    vi.mocked(getOrderById).mockResolvedValue({ ...guestOrder, userId: "dueno" } as never)
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "otro" } } as never)
    await abandonCheckoutOrder({ orderId: "order-1" })
    expect(cancelUnpaidOrder).not.toHaveBeenCalled()
  })

  it("con pago en curso (referencia) no se cancela", async () => {
    vi.mocked(getOrderById).mockResolvedValue({ ...guestOrder, paymentReference: "ref" } as never)
    await abandonCheckoutOrder({ orderId: "order-1", guestToken: "token-bueno" })
    expect(cancelUnpaidOrder).not.toHaveBeenCalled()
  })

  it("un pedido ya pagado no se toca", async () => {
    vi.mocked(getOrderById).mockResolvedValue({ ...guestOrder, status: "PAID", paymentStatus: "APPROVED" } as never)
    await abandonCheckoutOrder({ orderId: "order-1", guestToken: "token-bueno" })
    await holdStockWhilePaying({ orderId: "order-1", guestToken: "token-bueno" })
    expect(cancelUnpaidOrder).not.toHaveBeenCalled()
    expect(extendStockReservation).not.toHaveBeenCalled()
  })

  it("abrir ePayco alarga la reserva del dueño", async () => {
    vi.mocked(getOrderById).mockResolvedValue(guestOrder as never)
    await holdStockWhilePaying({ orderId: "order-1", guestToken: "token-bueno" })
    expect(extendStockReservation).toHaveBeenCalledWith("order-1")
  })

  it("una cuenta con demasiados pedidos queda frenada", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "c1", userType: "customer" } } as never)
    vi.mocked(consumePublicRateLimit).mockResolvedValue({ allowed: false } as never)
    const result = await createOrder(validCheckoutData)
    expect(result.success).toBe(false)
    expect(placeOrder).not.toHaveBeenCalled()
  })
})
