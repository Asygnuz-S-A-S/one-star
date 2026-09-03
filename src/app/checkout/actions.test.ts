import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }))
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock("@/server/services/order.service", () => ({ placeOrder: vi.fn() }))
vi.mock("@/server/services/abandoned-cart.service", () => ({
  markCartsRecoveredForEmail: vi.fn(),
}))

import { createOrder, type CheckoutData } from "./actions"
import { auth } from "@/lib/auth"
import { placeOrder } from "@/server/services/order.service"
import { markCartsRecoveredForEmail } from "@/server/services/abandoned-cart.service"

const validCheckoutData: CheckoutData = {
  email: "cliente@example.com",
  name: "Ana",
  lastName: "Pérez",
  phone: "3001234567",
  address: "Calle 1 # 2-3",
  city: "Bogotá",
  department: "Bogotá D.C.",
  shippingMethod: "standard",
  paymentMethod: "epayco",
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
  })

  it("rechaza una llamada anónima antes de crear el pedido", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    const result = await createOrder(validCheckoutData)

    expect(result).toMatchObject({
      success: false,
      code: "AUTH_REQUIRED",
    })
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("rechaza una sesión administrativa antes de crear el pedido", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "admin-1", userType: "admin" },
      session: {},
    } as never)

    const result = await createOrder(validCheckoutData)

    expect(result).toMatchObject({
      success: false,
      code: "AUTH_REQUIRED",
    })
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("usa el ID de la sesión customer al crear el pedido", async () => {
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
    expect(placeOrder).toHaveBeenCalledWith("customer-1", expect.any(Object))
  })

  it("valida el payload después de autenticar y antes de crear el pedido", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "customer-1", userType: "customer" },
      session: {},
    } as never)

    const result = await createOrder({ ...validCheckoutData, email: "correo-invalido" })

    expect(result).toMatchObject({ success: false, code: "VALIDATION_ERROR" })
    expect(placeOrder).not.toHaveBeenCalled()
  })
})
