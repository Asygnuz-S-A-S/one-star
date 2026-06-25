import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/cart.repository", () => ({
  findCartByUserId: vi.fn(),
  clearCartByUserId: vi.fn(),
}))

import { getUserCart, clearUserCart } from "../cart.service"
import { findCartByUserId, clearCartByUserId } from "@/server/repositories/cart.repository"

const mockFindCart = vi.mocked(findCartByUserId)
const mockClearCart = vi.mocked(clearCartByUserId)

const makeDecimal = (n: number) => ({ toNumber: () => n })

const mockCart = {
  id: "cart-1",
  userId: "user-1",
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      variantId: "var-1",
      quantity: 2,
      product: { name: "Zapatilla Nike", basePrice: makeDecimal(120000), salePrice: null },
      variant: { size: "42", color: "Negro" },
    },
    {
      id: "item-2",
      productId: "prod-2",
      variantId: "var-2",
      quantity: 1,
      product: { name: "Polo Adidas", basePrice: makeDecimal(80000), salePrice: makeDecimal(60000) },
      variant: { size: "M", color: "Blanco" },
    },
  ],
}

describe("getUserCart", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna null cuando el carrito no existe", async () => {
    mockFindCart.mockResolvedValue(null)
    const result = await getUserCart("user-999")
    expect(result).toBeNull()
  })

  it("mapea el carrito con sus items correctamente", async () => {
    mockFindCart.mockResolvedValue(mockCart as never)
    const result = await getUserCart("user-1")

    expect(result).not.toBeNull()
    expect(result!.id).toBe("cart-1")
    expect(result!.items).toHaveLength(2)
  })

  it("usa salePrice cuando el producto está en oferta", async () => {
    mockFindCart.mockResolvedValue(mockCart as never)
    const result = await getUserCart("user-1")
    const polo = result!.items.find((i) => i.productName === "Polo Adidas")
    expect(polo!.price).toBe(60000)
  })

  it("usa basePrice cuando el producto NO está en oferta", async () => {
    mockFindCart.mockResolvedValue(mockCart as never)
    const result = await getUserCart("user-1")
    const zapatilla = result!.items.find((i) => i.productName === "Zapatilla Nike")
    expect(zapatilla!.price).toBe(120000)
  })

  it("propaga los datos de variante (size, color)", async () => {
    mockFindCart.mockResolvedValue(mockCart as never)
    const result = await getUserCart("user-1")
    expect(result!.items[0].size).toBe("42")
    expect(result!.items[0].color).toBe("Negro")
  })
})

describe("clearUserCart", () => {
  it("llama al repositorio con el userId correcto", async () => {
    mockClearCart.mockResolvedValue(undefined)
    await clearUserCart("user-1")
    expect(mockClearCart).toHaveBeenCalledWith("user-1")
  })
})
