import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    brand: {
      findMany: m.findMany,
      findUnique: m.findUnique,
      create: m.create,
      update: m.update,
      delete: m.del,
    },
  },
}))

import {
  createBrandRecord,
  deleteBrandRecord,
  findBrandById,
  findBrandBySlug,
  findManyBrands,
  updateBrandRecord,
} from "../brand.repository"

beforeEach(() => vi.clearAllMocks())

describe("brand.repository", () => {
  it("lista alfabéticamente y pasa el filtro recibido", async () => {
    m.findMany.mockResolvedValue([])

    await findManyBrands({ isActive: true })

    expect(m.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
    })
  })

  it("busca por id y por slug", async () => {
    m.findUnique.mockResolvedValue(null)

    await findBrandById("brand_1")
    await findBrandBySlug("new-balance")

    expect(m.findUnique).toHaveBeenNthCalledWith(1, { where: { id: "brand_1" } })
    expect(m.findUnique).toHaveBeenNthCalledWith(2, { where: { slug: "new-balance" } })
  })

  it("crea, actualiza y elimina marcas", async () => {
    m.create.mockResolvedValue({ id: "brand_1" })
    m.update.mockResolvedValue({ id: "brand_1" })
    m.del.mockResolvedValue({ id: "brand_1" })

    await createBrandRecord({ name: "Veja", slug: "veja" } as never)
    await updateBrandRecord("brand_1", { isActive: false })
    await deleteBrandRecord("brand_1")

    expect(m.create).toHaveBeenCalledWith({ data: { name: "Veja", slug: "veja" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "brand_1" }, data: { isActive: false } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "brand_1" } })
  })
})
