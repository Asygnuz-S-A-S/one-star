import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/abandoned-cart.repository", () => ({
  findManyAbandonedCarts: vi.fn(),
  countAbandonedCarts: vi.fn(),
  markAbandonedCartRecovered: vi.fn(),
}))

import { getAbandonedCarts, recoverAbandonedCart } from "../abandoned-cart.service"
import {
  findManyAbandonedCarts,
  countAbandonedCarts,
  markAbandonedCartRecovered,
} from "@/server/repositories/abandoned-cart.repository"

const mockFind = vi.mocked(findManyAbandonedCarts)
const mockCount = vi.mocked(countAbandonedCarts)
const mockRecover = vi.mocked(markAbandonedCartRecovered)

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
