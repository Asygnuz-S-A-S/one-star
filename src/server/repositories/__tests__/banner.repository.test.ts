import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    banner: { findMany: m.findMany, create: m.create, update: m.update, delete: m.del },
  },
}))

import {
  createBannerRecord,
  deleteBannerRecord,
  findManyBanners,
  getActiveBanners,
  updateBannerRecord,
} from "../banner.repository"

beforeEach(() => vi.clearAllMocks())

describe("banner.repository", () => {
  it("lista todos los banners por posición", async () => {
    m.findMany.mockResolvedValue([])

    await findManyBanners()

    expect(m.findMany).toHaveBeenCalledWith({ orderBy: { position: "asc" } })
  })

  it("los activos incluyen los que no tienen fechas de vigencia", async () => {
    m.findMany.mockResolvedValue([])

    await getActiveBanners()

    const where = m.findMany.mock.calls[0][0].where
    expect(where.isActive).toBe(true)
    expect(where.AND[0].OR[0]).toEqual({ startDate: null })
    expect(where.AND[1].OR[0]).toEqual({ endDate: null })
  })

  it("los activos excluyen los que aún no empiezan o ya terminaron", async () => {
    m.findMany.mockResolvedValue([])

    await getActiveBanners()

    const where = m.findMany.mock.calls[0][0].where
    expect(where.AND[0].OR[1].startDate.lte).toBeInstanceOf(Date)
    expect(where.AND[1].OR[1].endDate.gte).toBeInstanceOf(Date)
  })

  it("crea, actualiza y elimina banners", async () => {
    m.create.mockResolvedValue({ id: "ban_1" })
    m.update.mockResolvedValue({ id: "ban_1" })
    m.del.mockResolvedValue({ id: "ban_1" })

    await createBannerRecord({ title: "Nuevo" } as never)
    await updateBannerRecord("ban_1", { isActive: false })
    await deleteBannerRecord("ban_1")

    expect(m.create).toHaveBeenCalledWith({ data: { title: "Nuevo" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "ban_1" }, data: { isActive: false } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "ban_1" } })
  })
})
