import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { user: m },
}))

import {
  countCustomers,
  countUsers,
  createUser,
  findCustomerProfileById,
  findManyCustomers,
  findUserByEmail,
  findUserById,
  updateUser,
} from "../user.repository"

beforeEach(() => vi.clearAllMocks())

describe("user.repository", () => {
  it("busca por id y por correo con las claves únicas", async () => {
    m.findUnique.mockResolvedValue(null)

    await findUserById("user_1")
    await findUserByEmail("ana@correo.com")

    expect(m.findUnique).toHaveBeenNthCalledWith(1, { where: { id: "user_1" } })
    expect(m.findUnique).toHaveBeenNthCalledWith(2, { where: { email: "ana@correo.com" } })
  })

  it("crea y actualiza usuarios", async () => {
    m.create.mockResolvedValue({ id: "user_1" })
    m.update.mockResolvedValue({ id: "user_1" })

    await createUser({ email: "ana@correo.com" } as never)
    await updateUser("user_1", { name: "Ana" })

    expect(m.create).toHaveBeenCalledWith({ data: { email: "ana@correo.com" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "user_1" }, data: { name: "Ana" } })
  })

  it("cuenta usuarios sin filtro y clientes con filtro", async () => {
    m.count.mockResolvedValue(12)

    expect(await countUsers()).toBe(12)
    expect(m.count).toHaveBeenCalledWith()

    await countCustomers({ email: { contains: "ana" } })
    expect(m.count).toHaveBeenLastCalledWith({ where: { email: { contains: "ana" } } })
  })

  it("el listado de clientes pagina y excluye los pedidos cancelados del total gastado", async () => {
    m.findMany.mockResolvedValue([])

    await findManyCustomers({}, 20, 40)

    expect(m.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 40,
        orderBy: { createdAt: "desc" },
        include: expect.objectContaining({
          orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } },
        }),
      })
    )
  })

  it("el perfil trae los pedidos más recientes primero y una sola imagen por producto del carrito", async () => {
    m.findUnique.mockResolvedValue(null)

    await findCustomerProfileById("user_1")

    const args = m.findUnique.mock.calls[0][0]
    expect(args.where).toEqual({ id: "user_1" })
    expect(args.include.orders.orderBy).toEqual({ createdAt: "desc" })
    expect(args.include.cart.include.items.include.product.include.images).toEqual({
      orderBy: { position: "asc" },
      take: 1,
    })
  })
})
