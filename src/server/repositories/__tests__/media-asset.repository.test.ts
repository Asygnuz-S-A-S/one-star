import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    mediaAsset: {
      findMany: m.findMany,
      findUnique: m.findUnique,
      count: m.count,
      create: m.create,
      delete: m.del,
    },
  },
}))

import {
  countMediaAssets,
  createMediaAssetRecord,
  deleteMediaAssetRecord,
  findManyMediaAssets,
  findMediaAssetById,
  findMediaAssetByUrl,
} from "../media-asset.repository"

beforeEach(() => vi.clearAllMocks())

describe("findManyMediaAssets", () => {
  it("sin opciones trae los 50 más recientes sin filtro", async () => {
    m.findMany.mockResolvedValue([])

    await findManyMediaAssets()

    expect(m.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: 0,
    })
  })

  it('trata "all" como ausencia de filtro por tipo', async () => {
    m.findMany.mockResolvedValue([])

    await findManyMediaAssets({ fileType: "all" })

    expect(m.findMany.mock.calls[0][0].where).toEqual({})
  })

  it("filtra por tipo concreto", async () => {
    m.findMany.mockResolvedValue([])

    await findManyMediaAssets({ fileType: "image" })

    expect(m.findMany.mock.calls[0][0].where).toEqual({ fileType: "image" })
  })

  it("busca por nombre sin distinguir mayúsculas y recorta espacios", async () => {
    m.findMany.mockResolvedValue([])

    await findManyMediaAssets({ search: "  logo  " })

    expect(m.findMany.mock.calls[0][0].where).toEqual({
      fileName: { contains: "logo", mode: "insensitive" },
    })
  })

  it("ignora una búsqueda que solo tiene espacios", async () => {
    m.findMany.mockResolvedValue([])

    await findManyMediaAssets({ search: "   " })

    expect(m.findMany.mock.calls[0][0].where).toEqual({})
  })

  it("respeta paginación", async () => {
    m.findMany.mockResolvedValue([])

    await findManyMediaAssets({ limit: 10, offset: 30 })

    expect(m.findMany.mock.calls[0][0]).toMatchObject({ take: 10, skip: 30 })
  })
})

describe("countMediaAssets", () => {
  it("aplica los mismos filtros que el listado", async () => {
    m.count.mockResolvedValue(3)

    await countMediaAssets({ fileType: "video", search: "promo" })

    expect(m.count).toHaveBeenCalledWith({
      where: {
        fileType: "video",
        fileName: { contains: "promo", mode: "insensitive" },
      },
    })
  })

  it("cuenta todo cuando no hay filtros", async () => {
    m.count.mockResolvedValue(9)

    expect(await countMediaAssets()).toBe(9)
    expect(m.count).toHaveBeenCalledWith({ where: {} })
  })
})

describe("consultas puntuales", () => {
  it("busca por id y por url, que también es única", async () => {
    m.findUnique.mockResolvedValue(null)

    await findMediaAssetById("ma_1")
    await findMediaAssetByUrl("https://cdn/img.png")

    expect(m.findUnique).toHaveBeenNthCalledWith(1, { where: { id: "ma_1" } })
    expect(m.findUnique).toHaveBeenNthCalledWith(2, { where: { url: "https://cdn/img.png" } })
  })

  it("crea y elimina registros", async () => {
    m.create.mockResolvedValue({ id: "ma_1" })
    m.del.mockResolvedValue({ id: "ma_1" })

    await createMediaAssetRecord({ url: "https://cdn/img.png" } as never)
    await deleteMediaAssetRecord("ma_1")

    expect(m.create).toHaveBeenCalledWith({ data: { url: "https://cdn/img.png" } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "ma_1" } })
  })
})
