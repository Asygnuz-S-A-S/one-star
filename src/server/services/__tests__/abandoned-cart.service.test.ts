import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/abandoned-cart.repository", () => ({
  findManyAbandonedCarts: vi.fn(),
  countAbandonedCarts: vi.fn(),
  markAbandonedCartRecovered: vi.fn(),
  findOpenAbandonedCartByEmail: vi.fn(),
  createAbandonedCartRecord: vi.fn(),
  updateAbandonedCartData: vi.fn(),
  markAbandonedCartsRecoveredByEmail: vi.fn(),
}))

import {
  getAbandonedCarts,
  recoverAbandonedCart,
  captureAbandonedCart,
  markCartsRecoveredForEmail,
} from "../abandoned-cart.service"
import {
  findManyAbandonedCarts,
  countAbandonedCarts,
  markAbandonedCartRecovered,
  findOpenAbandonedCartByEmail,
  createAbandonedCartRecord,
  updateAbandonedCartData,
  markAbandonedCartsRecoveredByEmail,
} from "@/server/repositories/abandoned-cart.repository"

const mockFind = vi.mocked(findManyAbandonedCarts)
const mockCount = vi.mocked(countAbandonedCarts)
const mockRecover = vi.mocked(markAbandonedCartRecovered)
const mockFindOpen = vi.mocked(findOpenAbandonedCartByEmail)
const mockCreateRecord = vi.mocked(createAbandonedCartRecord)
const mockUpdateData = vi.mocked(updateAbandonedCartData)
const mockRecoverByEmail = vi.mocked(markAbandonedCartsRecoveredByEmail)

const rawCart = {
  id: "ac-1",
  email: "cliente@example.com",
  userId: null,
  createdAt: new Date("2024-05-01T10:00:00Z"),
  recoveredAt: null,
  cartData: { items: [{ productId: "prod-1", quantity: 1 }] },
}

describe("getAbandonedCarts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna carritos y total paginados", async () => {
    mockFind.mockResolvedValue([rawCart])
    mockCount.mockResolvedValue(1)
    const result = await getAbandonedCarts(1, 10)
    expect(result.total).toBe(1)
    expect(result.carts).toHaveLength(1)
    expect(result.carts[0].email).toBe("cliente@example.com")
  })

  it("convierte createdAt a ISO string", async () => {
    mockFind.mockResolvedValue([rawCart])
    mockCount.mockResolvedValue(1)
    const { carts } = await getAbandonedCarts(1, 10)
    expect(carts[0].createdAt).toBe("2024-05-01T10:00:00.000Z")
  })

  it("recoveredAt es null cuando el carrito no fue recuperado", async () => {
    mockFind.mockResolvedValue([rawCart])
    mockCount.mockResolvedValue(1)
    const { carts } = await getAbandonedCarts(1, 10)
    expect(carts[0].recoveredAt).toBeNull()
  })

  it("recoveredAt es ISO string cuando el carrito fue recuperado", async () => {
    const recovered = { ...rawCart, recoveredAt: new Date("2024-05-02T08:00:00Z") }
    mockFind.mockResolvedValue([recovered])
    mockCount.mockResolvedValue(1)
    const { carts } = await getAbandonedCarts(1, 10)
    expect(carts[0].recoveredAt).toBe("2024-05-02T08:00:00.000Z")
  })

  it("calcula el skip correcto para la página 2", async () => {
    mockFind.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getAbandonedCarts(2, 15)
    expect(mockFind).toHaveBeenCalledWith(15, 15)
  })

  it("retorna arreglo vacío cuando no hay carritos abandonados", async () => {
    mockFind.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    const result = await getAbandonedCarts(1, 10)
    expect(result.carts).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe("recoverAbandonedCart", () => {
  it("llama al repositorio con el id correcto", async () => {
    mockRecover.mockResolvedValue(undefined as never)
    await recoverAbandonedCart("ac-1")
    expect(mockRecover).toHaveBeenCalledWith("ac-1")
  })
})

describe("captureAbandonedCart", () => {
  beforeEach(() => vi.clearAllMocks())

  const items = [{ productId: "prod-1", variantId: "var-1", name: "Nike Air", quantity: 1, price: 135000 }]

  it("crea un registro nuevo cuando el email no tiene carrito abierto", async () => {
    mockFindOpen.mockResolvedValue(null)
    await captureAbandonedCart("cliente@example.com", items, null)
    expect(mockCreateRecord).toHaveBeenCalledWith({
      email: "cliente@example.com",
      cartData: items,
      userId: null,
    })
    expect(mockUpdateData).not.toHaveBeenCalled()
  })

  it("actualiza el carrito abierto existente en vez de duplicar", async () => {
    mockFindOpen.mockResolvedValue(rawCart as never)
    await captureAbandonedCart("cliente@example.com", items)
    expect(mockUpdateData).toHaveBeenCalledWith("ac-1", items)
    expect(mockCreateRecord).not.toHaveBeenCalled()
  })

  it("asocia el userId cuando el visitante tiene sesión", async () => {
    mockFindOpen.mockResolvedValue(null)
    await captureAbandonedCart("cliente@example.com", items, "user-1")
    expect(mockCreateRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" })
    )
  })
})

describe("markCartsRecoveredForEmail", () => {
  it("cierra todos los carritos abiertos del email", async () => {
    mockRecoverByEmail.mockResolvedValue({ count: 2 } as never)
    await markCartsRecoveredForEmail("cliente@example.com")
    expect(mockRecoverByEmail).toHaveBeenCalledWith("cliente@example.com")
  })
})
