import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { abandonedCart: m },
}))

import {
  countAbandonedCarts,
  createAbandonedCartRecord,
  findManyAbandonedCarts,
  findOpenAbandonedCartByEmail,
  markAbandonedCartRecovered,
  markAbandonedCartsRecoveredByEmail,
  updateAbandonedCartData,
} from "../abandoned-cart.repository"

beforeEach(() => vi.clearAllMocks())

describe("abandoned-cart.repository", () => {
  it("pagina los carritos más recientes primero", async () => {
    m.findMany.mockResolvedValue([])

    await findManyAbandonedCarts(10, 20)

    expect(m.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 20,
    })
  })

  it("cuenta el total", async () => {
    m.count.mockResolvedValue(7)

    expect(await countAbandonedCarts()).toBe(7)
  })

  it("marca uno como recuperado con la fecha actual", async () => {
    m.update.mockResolvedValue({ id: "ab_1" })

    await markAbandonedCartRecovered("ab_1")

    const args = m.update.mock.calls[0][0]
    expect(args.where).toEqual({ id: "ab_1" })
    expect(args.data.recoveredAt).toBeInstanceOf(Date)
  })

  it("busca solo el carrito abierto más reciente de un correo", async () => {
    m.findFirst.mockResolvedValue(null)

    await findOpenAbandonedCartByEmail("ana@correo.com")

    expect(m.findFirst).toHaveBeenCalledWith({
      where: { email: "ana@correo.com", recoveredAt: null },
      orderBy: { createdAt: "desc" },
    })
  })

  it("normaliza el userId ausente a null al crear", async () => {
    m.create.mockResolvedValue({ id: "ab_1" })

    await createAbandonedCartRecord({ email: "ana@correo.com", cartData: { items: [] } })

    expect(m.create).toHaveBeenCalledWith({
      data: { email: "ana@correo.com", cartData: { items: [] }, userId: null },
    })
  })

  it("actualiza el contenido del carrito guardado", async () => {
    m.update.mockResolvedValue({ id: "ab_1" })

    await updateAbandonedCartData("ab_1", { items: [1] })

    expect(m.update).toHaveBeenCalledWith({
      where: { id: "ab_1" },
      data: { cartData: { items: [1] } },
    })
  })

  it("cierra de una vez todos los carritos abiertos de un correo tras la compra", async () => {
    m.updateMany.mockResolvedValue({ count: 2 })

    await markAbandonedCartsRecoveredByEmail("ana@correo.com")

    const args = m.updateMany.mock.calls[0][0]
    expect(args.where).toEqual({ email: "ana@correo.com", recoveredAt: null })
    expect(args.data.recoveredAt).toBeInstanceOf(Date)
  })
})
