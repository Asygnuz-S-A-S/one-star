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

const mockCreate = vi.mocked(createOrder)
const mockFindById = vi.mocked(findOrderById)
const mockFindMany = vi.mocked(findManyOrders)
const mockFindByUser = vi.mocked(findOrdersByUserId)
const mockCount = vi.mocked(countOrders)
const mockUpdateStatus = vi.mocked(updateOrderStatus)
const mockUpdateTracking = vi.mocked(updateOrderStatusAndTracking)
const mockGetStock = vi.mocked(getVariantsStock)
const mockMarkPaid = vi.mocked(markOrderPaidWithStock)

const makeDecimal = (n: number) => ({ toNumber: () => n })

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
  total: 270000,
  items: [
    { productId: "prod-1", sku: "NK-001", productName: "Nike Air Max", quantity: 2, unitPrice: 120000 },
  ],
  customerName: "Juan Pérez",
  customerEmail: "test@example.com",
  paymentMethod: "card",
}

describe("placeOrder", () => {
  beforeEach(() => vi.clearAllMocks())

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
  beforeEach(() => vi.clearAllMocks())

  const inputWithVariant = {
    total: 240000,
    items: [
      {
        productId: "prod-1",
        variantId: "var-1",
        sku: "NK-001",
        productName: "Nike Air Max",
        quantity: 2,
        unitPrice: 120000,
      },
    ],
    customerName: "Juan Pérez",
    customerEmail: "test@example.com",
    paymentMethod: "card",
  }

  it("crea el pedido cuando hay stock suficiente", async () => {
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 5, sku: "NK-001" }])
    mockCreate.mockResolvedValue(rawOrder as never)
    const result = await placeOrder("user-1", inputWithVariant)
    expect(result.id).toBe("order-1")
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it("rechaza el pedido cuando el stock es insuficiente", async () => {
    mockGetStock.mockResolvedValue([{ id: "var-1", stock: 1, sku: "NK-001" }])
    await expect(placeOrder("user-1", inputWithVariant)).rejects.toThrow(
      /stock insuficiente/i
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("rechaza cuando la variante no existe (stock 0)", async () => {
    mockGetStock.mockResolvedValue([])
    await expect(placeOrder("user-1", inputWithVariant)).rejects.toThrow(
      /stock insuficiente/i
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("no consulta stock si los items no tienen variantId", async () => {
    mockCreate.mockResolvedValue(rawOrder as never)
    await placeOrder("user-1", orderInput)
    expect(mockGetStock).not.toHaveBeenCalled()
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
