import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findUnique, deleteMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { cart: { findUnique }, cartItem: { deleteMany } },
}))

import { clearCartByUserId, findCartByUserId } from "../cart.repository"

beforeEach(() => vi.clearAllMocks())

describe("findCartByUserId", () => {
  it("solo trae ítems de productos publicados y disponibles en línea", async () => {
    findUnique.mockResolvedValue(null)

    await findCartByUserId("user_1")

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        include: expect.objectContaining({
          items: expect.objectContaining({
            where: { product: { isPublished: true, availableOnline: true } },
          }),
        }),
      })
    )
  })
})

describe("clearCartByUserId", () => {
  it("borra los ítems del carrito del usuario", async () => {
    findUnique.mockResolvedValue({ id: "cart_1" })

    await clearCartByUserId("user_1")

    expect(deleteMany).toHaveBeenCalledWith({ where: { cartId: "cart_1" } })
  })

  it("no intenta borrar nada si el usuario no tiene carrito", async () => {
    findUnique.mockResolvedValue(null)

    await clearCartByUserId("user_1")

    expect(deleteMany).not.toHaveBeenCalled()
  })
})
