import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/media-asset.repository", () => ({
  findManyMediaAssets: vi.fn(),
  countMediaAssets: vi.fn(),
  findMediaAssetById: vi.fn(),
  findMediaAssetByUrl: vi.fn(),
  createMediaAssetRecord: vi.fn(),
  deleteMediaAssetRecord: vi.fn(),
}))

const prismaMock = vi.hoisted(() => ({
  storeLogo: { findMany: vi.fn() },
  banner: { findMany: vi.fn() },
  brand: { findMany: vi.fn() },
  productImage: { findMany: vi.fn() },
}))

vi.mock("@/server/db/prisma", () => ({ prisma: prismaMock }))

import {
  autoSyncExistingAssets,
  createMediaAsset,
  deleteMediaAsset,
  getMediaAssets,
} from "../media-asset.service"
import {
  countMediaAssets,
  createMediaAssetRecord,
  deleteMediaAssetRecord,
  findManyMediaAssets,
  findMediaAssetById,
  findMediaAssetByUrl,
} from "@/server/repositories/media-asset.repository"

const count = vi.mocked(countMediaAssets)
const findMany = vi.mocked(findManyMediaAssets)
const findById = vi.mocked(findMediaAssetById)
const findByUrl = vi.mocked(findMediaAssetByUrl)
const create = vi.mocked(createMediaAssetRecord)
const remove = vi.mocked(deleteMediaAssetRecord)

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "ma_1",
    url: "https://cdn/img.png",
    publicId: null,
    fileName: "img.png",
    fileType: "image",
    mimeType: null,
    fileSize: null,
    folder: "general",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  }
}

function sinRecursosPrevios() {
  prismaMock.storeLogo.findMany.mockResolvedValue([])
  prismaMock.banner.findMany.mockResolvedValue([])
  prismaMock.brand.findMany.mockResolvedValue([])
  prismaMock.productImage.findMany.mockResolvedValue([])
}

beforeEach(() => {
  vi.clearAllMocks()
  sinRecursosPrevios()
})

describe("getMediaAssets", () => {
  it("devuelve los recursos y el total", async () => {
    count.mockResolvedValue(1)
    findMany.mockResolvedValue([asset()] as never)

    const result = await getMediaAssets()

    expect(result.total).toBe(1)
    expect(result.items[0]).toMatchObject({ id: "ma_1", fileName: "img.png" })
  })

  it("sincroniza los recursos existentes la primera vez que la biblioteca está vacía", async () => {
    count.mockResolvedValueOnce(0).mockResolvedValue(0)
    findMany.mockResolvedValue([])

    await getMediaAssets()

    expect(prismaMock.storeLogo.findMany).toHaveBeenCalled()
  })

  it("no vuelve a sincronizar cuando ya hay recursos registrados", async () => {
    count.mockResolvedValue(5)
    findMany.mockResolvedValue([])

    await getMediaAssets()

    expect(prismaMock.storeLogo.findMany).not.toHaveBeenCalled()
  })

  it("no tumba la biblioteca si la sincronización automática falla", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    count.mockResolvedValueOnce(0).mockResolvedValue(0)
    prismaMock.storeLogo.findMany.mockRejectedValue(new Error("db caída"))
    findMany.mockResolvedValue([])

    await expect(getMediaAssets()).resolves.toMatchObject({ items: [], total: 0 })
  })
})

describe("createMediaAsset", () => {
  it("no duplica un recurso ya registrado con la misma URL", async () => {
    findByUrl.mockResolvedValue(asset() as never)

    const result = await createMediaAsset({
      url: "https://cdn/img.png",
      fileName: "img.png",
      fileType: "image",
    })

    expect(result.id).toBe("ma_1")
    expect(create).not.toHaveBeenCalled()
  })

  it('guarda en la carpeta "general" cuando no se indica otra', async () => {
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    await createMediaAsset({
      url: "https://cdn/nueva.png",
      fileName: "nueva.png",
      fileType: "image",
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "general", publicId: null, fileSize: null })
    )
  })
})

describe("deleteMediaAsset", () => {
  it("elimina el recurso existente", async () => {
    findById.mockResolvedValue(asset() as never)
    remove.mockResolvedValue(asset() as never)

    await deleteMediaAsset("ma_1")

    expect(remove).toHaveBeenCalledWith("ma_1")
  })

  it("no falla ni borra nada si el recurso ya no existe", async () => {
    findById.mockResolvedValue(null)

    await deleteMediaAsset("ma_1")

    expect(remove).not.toHaveBeenCalled()
  })
})

describe("autoSyncExistingAssets", () => {
  it("registra logos, banners, marcas e imágenes de producto que faltaban", async () => {
    prismaMock.storeLogo.findMany.mockResolvedValue([
      { url: "/logos/a.svg", fileName: "a.svg", type: "desktop" },
    ])
    prismaMock.banner.findMany.mockResolvedValue([
      { imageUrl: "/banners/b.mp4", title: "Promo Verano", mediaType: "video" },
    ])
    prismaMock.brand.findMany.mockResolvedValue([
      { logoUrl: "/marcas/nike.png", name: "New Balance" },
    ])
    prismaMock.productImage.findMany.mockResolvedValue([
      { url: "/productos/p.jpg", alt: "Zapato Rojo" },
    ])
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    expect(await autoSyncExistingAssets()).toBe(4)

    const carpetas = create.mock.calls.map((c) => (c[0] as { folder: string }).folder)
    expect(carpetas).toEqual(["logos", "banners", "marcas", "productos"])
  })

  it("clasifica el banner de video como video", async () => {
    prismaMock.banner.findMany.mockResolvedValue([
      { imageUrl: "/banners/b.mp4", title: "Promo", mediaType: "video" },
    ])
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    await autoSyncExistingAssets()

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ fileType: "video" }))
  })

  it("deriva el nombre del archivo del título, en minúsculas y con guiones", async () => {
    prismaMock.brand.findMany.mockResolvedValue([
      { logoUrl: "/marcas/nb.png", name: "New Balance" },
    ])
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    await autoSyncExistingAssets()

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "new-balance-logo.png" })
    )
  })

  it("omite los recursos que ya estaban registrados", async () => {
    prismaMock.storeLogo.findMany.mockResolvedValue([{ url: "/logos/a.svg", type: "desktop" }])
    findByUrl.mockResolvedValue(asset() as never)

    expect(await autoSyncExistingAssets()).toBe(0)
    expect(create).not.toHaveBeenCalled()
  })

  it("limita el barrido de imágenes de producto a 50 registros", async () => {
    await autoSyncExistingAssets()

    expect(prismaMock.productImage.findMany).toHaveBeenCalledWith({
      take: 50,
      orderBy: { id: "desc" },
    })
  })
})
