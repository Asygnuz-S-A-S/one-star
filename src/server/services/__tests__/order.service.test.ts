import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/order.repository", () => ({
  createOrder: vi.fn(),
  findOrderById: vi.fn(),
  findManyOrders: vi.fn(),
  findOrdersByUserId: vi.fn(),
  countOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateOrderStatusAndTracking: vi.fn(),
  getOrderStats: vi.fn(),
  getVariantsStock: vi.fn(),
  markOrderPaidWithStock: vi.fn(),
}))

vi.mock("@/server/erp", () => ({
  getERPAdapter: vi.fn(() => ({
    onOrderConfirmed: vi.fn().mockResolvedValue({ success: true }),
  })),
}))

vi.mock("@/server/repositories/variant.repository", () => ({
  findVariantsForPricing: vi.fn(),
}))

vi.mock("@/server/services/coupon.service", () => ({
  validateCouponForOrder: vi.fn(),
  registerCouponUsage: vi.fn(),
  releaseCouponUsage: vi.fn(),
}))

import {
  placeOrder,
  getOrderById,
  getRecentOrders,
  getUserOrders,
  getAdminOrders,
  changeOrderStatus,
  changeOrderStatusAndTracking,
  getOrderTabCounts,
} from "../order.service"
import {
  createOrder,
  findOrderById,
  findManyOrders,
  findOrdersByUserId,
  countOrders,
  updateOrderStatus,
  updateOrderStatusAndTracking,
  getVariantsStock,
  markOrderPaidWithStock,
} from "@/server/repositories/order.repository"
import { findVariantsForPricing } from "@/server/repositories/variant.repository"
import {
  validateCouponForOrder,
  registerCouponUsage,
  releaseCouponUsage,
} from "@/server/services/coupon.service"

const mockCreate = vi.mocked(createOrder)
const mockFindById = vi.mocked(findOrderById)
const mockFindMany = vi.mocked(findManyOrders)
const mockFindByUser = vi.mocked(findOrdersByUserId)
const mockCount = vi.mocked(countOrders)
const mockUpdateStatus = vi.mocked(updateOrderStatus)
const mockUpdateTracking = vi.mocked(updateOrderStatusAndTracking)
const mockGetStock = vi.mocked(getVariantsStock)
const mockMarkPaid = vi.mocked(markOrderPaidWithStock)
const mockPricing = vi.mocked(findVariantsForPricing)
const mockValidateCoupon = vi.mocked(validateCouponForOrder)
const mockRegisterUsage = vi.mocked(registerCouponUsage)
const mockReleaseUsage = vi.mocked(releaseCouponUsage)

const makeDecimal = (n: number) => ({ toNumber: () => n })

/** Variante como la devuelve findVariantsForPricing (precio real en BD: 135.000) */
const pricedVariant = {
  id: "var-1",
  sku: "NK-001",
  stock: 5,
  productId: "prod-1",
  product: {
    id: "prod-1",
    name: "Nike Air Max",
    basePrice: makeDecimal(135000),
    isOnSale: false,
    salePrice: null,
  },
}

const rawOrder = {
  id: "order-1",
  status: "PENDING",
  total: makeDecimal(270000),
  paymentMethod: "card",
  trackingNumber: null,
  customerEmail: "test@example.com",
  customerName: "Juan Pérez",
  shippingAddress: { city: "Bogotá" },
  userId: "user-1",
  user: { email: "test@example.com" },
  createdAt: new Date("2024-03-01"),
  updatedAt: new Date("2024-03-01"),
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      orderId: "order-1",
      variantId: null,
      product: { name: "Nike Air Max", images: [{ url: "/nike.jpg" }] },
      quantity: 2,
      unitPrice: makeDecimal(120000),
    },
  ],
}

const orderInput = {
  items: [
    {
      productId: "prod-1",
      variantId: "var-1",
      sku: "NK-001",
      productName: "Nike Air Max",
      quantity: 2,
    },
  ],
  shippingMethod: "standard" as const,
  customerName: "Juan Pérez",
  customerEmail: "test@example.com",
  paymentMethod: "card",
}

describe("placeOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPricing.mockResolvedValue([pricedVariant] as never)
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 5, sku: "NK-001" }])
  })

  it("persiste el pedido y retorna el DTO", async () => {
    mockCreate.mockResolvedValue(rawOrder as never)
    const result = await placeOrder("user-1", orderInput)
    expect(result.id).toBe("order-1")
    expect(result.total).toBe(270000)
    expect(result.status).toBe("PENDING")
  })

  it("mapea los items del pedido correctamente", async () => {
    mockCreate.mockResolvedValue(rawOrder as never)
    const result = await placeOrder("user-1", orderInput)
    expect(result.items).toHaveLength(1)
    expect(result.items![0].productName).toBe("Nike Air Max")
    expect(result.items![0].unitPrice).toBe(120000)
  })

  it("funciona para usuario invitado (userId null)", async () => {
    mockCreate.mockResolvedValue({ ...rawOrder, userId: null, user: null } as never)
    const result = await placeOrder(null, orderInput)
    expect(result.userId).toBeNull()
    expect(result.userEmail).toBeNull()
  })

  it("siempre llama a createOrder independientemente del ERP", async () => {
    mockCreate.mockResolvedValue(rawOrder as never)
    await placeOrder("user-1", orderInput)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})

describe("placeOrder — cupones", () => {
  const validCoupon = {
    valid: true as const,
    id: "cup-1",
    code: "PROMO20",
    discountType: "FIXED_AMOUNT" as const,
    discountValue: 20000,
    discountAmount: 20000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPricing.mockResolvedValue([pricedVariant] as never)
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 5, sku: "NK-001" }])
    mockCreate.mockResolvedValue(rawOrder as never)
  })

  it("aplica el descuento del cupón al total (revalidado en servidor)", async () => {
    mockValidateCoupon.mockResolvedValue(validCoupon)
    mockRegisterUsage.mockResolvedValue(true)
    // 2 × 135.000 = 270.000 → envío gratis; 270.000 − 20.000 = 250.000
    await placeOrder("user-1", { ...orderInput, couponCode: "PROMO20" })
    expect(mockValidateCoupon).toHaveBeenCalledWith("PROMO20", 270000)
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ total: 250000 }))
  })

  it("registra el uso del cupón antes de crear el pedido", async () => {
    mockValidateCoupon.mockResolvedValue(validCoupon)
    mockRegisterUsage.mockResolvedValue(true)
    await placeOrder("user-1", { ...orderInput, couponCode: "PROMO20" })
    expect(mockRegisterUsage).toHaveBeenCalledWith("cup-1")
    expect(mockRegisterUsage.mock.invocationCallOrder[0]).toBeLessThan(
      mockCreate.mock.invocationCallOrder[0]
    )
  })

  it("rechaza el pedido cuando el cupón ya no es válido", async () => {
    mockValidateCoupon.mockResolvedValue({ valid: false, reason: "Cupón no válido" })
    await expect(
      placeOrder("user-1", { ...orderInput, couponCode: "GHOST" })
    ).rejects.toThrow(/cupón/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("rechaza el pedido si el tope de usos se agotó justo antes de crear", async () => {
    mockValidateCoupon.mockResolvedValue(validCoupon)
    mockRegisterUsage.mockResolvedValue(false)
    await expect(
      placeOrder("user-1", { ...orderInput, couponCode: "PROMO20" })
    ).rejects.toThrow(/límite de usos/)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("libera el uso reservado si la creación del pedido falla", async () => {
    mockValidateCoupon.mockResolvedValue(validCoupon)
    mockRegisterUsage.mockResolvedValue(true)
    mockCreate.mockRejectedValue(new Error("DB caída"))
    await expect(
      placeOrder("user-1", { ...orderInput, couponCode: "PROMO20" })
    ).rejects.toThrow("DB caída")
    expect(mockReleaseUsage).toHaveBeenCalledWith("cup-1")
  })

  it("registra código y descuento en el shippingAddress del pedido", async () => {
    mockValidateCoupon.mockResolvedValue(validCoupon)
    mockRegisterUsage.mockResolvedValue(true)
    await placeOrder("user-1", { ...orderInput, couponCode: "PROMO20" })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingAddress: expect.objectContaining({
          couponCode: "PROMO20",
          couponDiscount: 20000,
        }),
      })
    )
  })

  it("no consulta cupones cuando el pedido no trae código", async () => {
    await placeOrder("user-1", orderInput)
    expect(mockValidateCoupon).not.toHaveBeenCalled()
    expect(mockRegisterUsage).not.toHaveBeenCalled()
  })
})

describe("placeOrder — seguridad de precios", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPricing.mockResolvedValue([pricedVariant] as never)
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 5, sku: "NK-001" }])
    mockCreate.mockResolvedValue(rawOrder as never)
  })

  it("calcula el total desde la BD, no desde el cliente", async () => {
    // 2 × 135.000 (precio BD) = 270.000 ≥ 200.000 → envío gratis
    await placeOrder("user-1", orderInput)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ total: 270000 })
    )
    const input = mockCreate.mock.calls[0][0] as {
      items: { create: { unitPrice: number }[] }
    }
    expect(input.items.create[0].unitPrice).toBe(135000)
  })

  it("usa el precio de oferta cuando el producto está en sale", async () => {
    mockPricing.mockResolvedValue([
      {
        ...pricedVariant,
        product: {
          ...pricedVariant.product,
          isOnSale: true,
          salePrice: makeDecimal(100000),
        },
      },
    ] as never)
    await placeOrder("user-1", orderInput)
    // 2 × 100.000 = 200.000 → envío gratis → total 200.000
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ total: 200000 })
    )
  })

  it("suma el costo de envío estándar bajo el umbral", async () => {
    await placeOrder("user-1", { ...orderInput, items: [{ ...orderInput.items[0], quantity: 1 }] })
    // 135.000 < 200.000 → envío 15.000 → total 150.000
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ total: 150000 })
    )
  })

  it("rechaza ítems sin variantId", async () => {
    await expect(
      placeOrder("user-1", {
        ...orderInput,
        items: [{ productId: "prod-1", sku: "NK-001", productName: "Nike Air Max", quantity: 1 }],
      })
    ).rejects.toThrow(/variante/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("rechaza cuando la variante no pertenece al producto indicado", async () => {
    await expect(
      placeOrder("user-1", {
        ...orderInput,
        items: [{ ...orderInput.items[0], productId: "otro-producto" }],
      })
    ).rejects.toThrow(/inconsistentes/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("rechaza cuando la variante ya no existe en la BD", async () => {
    mockPricing.mockResolvedValue([] as never)
    await expect(placeOrder("user-1", orderInput)).rejects.toThrow(/no está disponible/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe("getOrderById", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna el DTO cuando el pedido existe", async () => {
    mockFindById.mockResolvedValue(rawOrder as never)
    const result = await getOrderById("order-1")
    expect(result).not.toBeNull()
    expect(result!.customerName).toBe("Juan Pérez")
  })

  it("retorna null cuando el pedido no existe", async () => {
    mockFindById.mockResolvedValue(null)
    const result = await getOrderById("no-existe")
    expect(result).toBeNull()
  })
})

describe("getRecentOrders", () => {
  it("retorna la lista de pedidos recientes", async () => {
    mockFindMany.mockResolvedValue([rawOrder] as never)
    const result = await getRecentOrders(10)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("order-1")
  })
})

describe("getUserOrders", () => {
  it("retorna pedidos del usuario", async () => {
    mockFindByUser.mockResolvedValue([rawOrder] as never)
    const result = await getUserOrders("user-1")
    expect(result).toHaveLength(1)
    expect(result[0].userId).toBe("user-1")
  })
})

describe("getAdminOrders", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna pedidos paginados y total", async () => {
    mockFindMany.mockResolvedValue([rawOrder] as never)
    mockCount.mockResolvedValue(1)
    const result = await getAdminOrders("ALL", "", 1, 10)
    expect(result.total).toBe(1)
    expect(result.orders).toHaveLength(1)
  })

  it("filtra por status cuando no es ALL", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getAdminOrders("PENDING", "", 1, 10)
    expect(mockFindMany).toHaveBeenCalledWith(
      10,
      0,
      expect.objectContaining({ status: "PENDING" })
    )
  })

  it("agrega búsqueda por email/nombre cuando hay query", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getAdminOrders("ALL", "juan", 1, 10)
    expect(mockFindMany).toHaveBeenCalledWith(
      10,
      0,
      expect.objectContaining({ OR: expect.any(Array) })
    )
  })
})

describe("getOrderTabCounts", () => {
  it("retorna conteos para cada tab", async () => {
    mockCount.mockResolvedValueOnce(5).mockResolvedValueOnce(3).mockResolvedValueOnce(1)
    const result = await getOrderTabCounts(["ALL", "PENDING", "SHIPPED"])
    expect(result).toEqual([5, 3, 1])
  })
})

describe("changeOrderStatus", () => {
  it("llama al repositorio con id y status", async () => {
    mockUpdateStatus.mockResolvedValue(undefined as never)
    await changeOrderStatus("order-1", "SHIPPED")
    expect(mockUpdateStatus).toHaveBeenCalledWith("order-1", "SHIPPED")
  })
})

describe("changeOrderStatusAndTracking", () => {
  beforeEach(() => vi.clearAllMocks())

  it("llama al repositorio con id, status y tracking", async () => {
    mockUpdateTracking.mockResolvedValue(undefined as never)
    await changeOrderStatusAndTracking("order-1", "SHIPPED", "TRK123")
    expect(mockUpdateTracking).toHaveBeenCalledWith("order-1", "SHIPPED", "TRK123")
  })

  it("usa el flujo de descuento de stock al pasar a PAID", async () => {
    mockMarkPaid.mockResolvedValue(rawOrder as never)
    await changeOrderStatusAndTracking("order-1", "PAID", "TRK999")
    expect(mockMarkPaid).toHaveBeenCalledWith("order-1", "TRK999")
    expect(mockUpdateTracking).not.toHaveBeenCalled()
  })
})

describe("placeOrder — validación de stock", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPricing.mockResolvedValue([pricedVariant] as never)
  })

  it("crea el pedido cuando hay stock suficiente", async () => {
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 5, sku: "NK-001" }])
    mockCreate.mockResolvedValue(rawOrder as never)
    const result = await placeOrder("user-1", orderInput)
    expect(result.id).toBe("order-1")
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it("rechaza el pedido cuando el stock es insuficiente", async () => {
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 1, sku: "NK-001" }])
    await expect(placeOrder("user-1", orderInput)).rejects.toThrow(
      /stock local insuficiente/i
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("rechaza cuando la variante no tiene stock registrado", async () => {
    mockGetStock.mockResolvedValue([])
    await expect(placeOrder("user-1", orderInput)).rejects.toThrow(
      /stock local insuficiente/i
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe("changeOrderStatus — PAID descuenta stock", () => {
  beforeEach(() => vi.clearAllMocks())

  it("usa markOrderPaidWithStock al pasar a PAID", async () => {
    mockMarkPaid.mockResolvedValue(rawOrder as never)
    await changeOrderStatus("order-1", "PAID")
    expect(mockMarkPaid).toHaveBeenCalledWith("order-1")
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it("usa updateOrderStatus normal para otros estados", async () => {
    mockUpdateStatus.mockResolvedValue(undefined as never)
    await changeOrderStatus("order-1", "DELIVERED")
    expect(mockUpdateStatus).toHaveBeenCalledWith("order-1", "DELIVERED")
    expect(mockMarkPaid).not.toHaveBeenCalled()
  })
})
