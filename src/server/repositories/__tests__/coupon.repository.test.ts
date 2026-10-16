import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    coupon: { ...m, fields: { maxUses: "maxUses" } },
  },
}))

import {
  createCouponRecord,
  findCouponByCode,
  findCouponById,
  findManyCoupons,
  incrementCouponUsage,
  updateCouponRecord,
} from "../coupon.repository"

beforeEach(() => vi.clearAllMocks())

describe("coupon.repository", () => {
  it("lista los cupones más recientes primero", async () => {
    m.findMany.mockResolvedValue([])

    await findManyCoupons()

    expect(m.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } })
  })

  it("busca por código y por id", async () => {
    m.findUnique.mockResolvedValue(null)

    await findCouponByCode("VERANO10")
    await findCouponById("cup_1")

    expect(m.findUnique).toHaveBeenNthCalledWith(1, { where: { code: "VERANO10" } })
    expect(m.findUnique).toHaveBeenNthCalledWith(2, { where: { id: "cup_1" } })
  })

  it("crea y actualiza cupones", async () => {
    m.create.mockResolvedValue({ id: "cup_1" })
    m.update.mockResolvedValue({ id: "cup_1" })

    await createCouponRecord({ code: "VERANO10" } as never)
    await updateCouponRecord("cup_1", { isActive: false })

    expect(m.create).toHaveBeenCalledWith({ data: { code: "VERANO10" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "cup_1" }, data: { isActive: false } })
  })
})

describe("incrementCouponUsage", () => {
  it("condiciona el incremento al tope de usos, para no pasarse bajo concurrencia", async () => {
    m.updateMany.mockResolvedValue({ count: 1 })

    expect(await incrementCouponUsage("cup_1")).toBe(true)

    const args = m.updateMany.mock.calls[0][0]
    expect(args.where.id).toBe("cup_1")
    expect(args.where.OR[0]).toEqual({ maxUses: null })
    expect(args.data).toEqual({ usedCount: { increment: 1 } })
  })

  it("devuelve false cuando el cupón ya agotó sus usos", async () => {
    m.updateMany.mockResolvedValue({ count: 0 })

    expect(await incrementCouponUsage("cup_1")).toBe(false)
  })
})
