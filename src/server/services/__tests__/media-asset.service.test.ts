import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/media-asset.repository", () => ({
  findManyMediaAssets: vi.fn(),
  countMediaAssets: vi.fn(),
  findMediaAssetById: vi.fn(),
  findMediaAssetByUrl: vi.fn(),
  createMediaAssetRecord: vi.fn(),
  deleteMediaAssetRecord: vi.fn(),
  findMediaAssetSources: vi.fn(),
  findMediaAssetReferences: vi.fn(),
}))

import {
  autoSyncExistingAssets,
  createMediaAsset,
  deleteMediaAsset,
  getMediaAssetDeletionInfo,
  getMediaAssets,
} from "../media-asset.service"
import {
  countMediaAssets,
  createMediaAssetRecord,
  deleteMediaAssetRecord,
  findManyMediaAssets,
  findMediaAssetById,
  findMediaAssetByUrl,
  findMediaAssetSources,
  findMediaAssetReferences,
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

const findSources = vi.mocked(findMediaAssetSources)
const findReferences = vi.mocked(findMediaAssetReferences)

function sinRecursosPrevios() {
  findSources.mockResolvedValue({ logos: [], banners: [], brands: [], productImages: [] } as never)
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

    expect(findSources).toHaveBeenCalled()
  })

  it("no vuelve a sincronizar cuando ya hay recursos registrados", async () => {
    count.mockResolvedValue(5)
    findMany.mockResolvedValue([])

    await getMediaAssets()

    expect(findSources).not.toHaveBeenCalled()
  })

  it("no tumba la biblioteca si la sincronización automática falla", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    count.mockResolvedValueOnce(0).mockResolvedValue(0)
    findSources.mockRejectedValue(new Error("db caída"))
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

describe("getMediaAssetDeletionInfo", () => {
  it("informa las referencias antes de retirar el índice de biblioteca", async () => {
    findById.mockResolvedValue(asset() as never)
    findReferences.mockResolvedValue({ banners: 1, productImages: 2, logos: 0, brands: 0, landingSections: 1 })

    await expect(getMediaAssetDeletionInfo("ma_1")).resolves.toEqual({
      exists: true,
      referenceCount: 4,
      references: { banners: 1, productImages: 2, logos: 0, brands: 0, landingSections: 1 },
    })
  })
})

describe("autoSyncExistingAssets", () => {
  it("registra logos, banners, marcas e imágenes de producto que faltaban", async () => {
    findSources.mockResolvedValue({
      logos: [{ url: "/logos/a.svg", fileName: "a.svg", type: "desktop" }],
      banners: [{ imageUrl: "/banners/b.mp4", title: "Promo Verano", mediaType: "video" }],
      brands: [{ logoUrl: "/marcas/nike.png", name: "New Balance" }],
      productImages: [{ url: "/productos/p.jpg", alt: "Zapato Rojo" }],
    } as never)
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    expect(await autoSyncExistingAssets()).toBe(4)

    const carpetas = create.mock.calls.map((c) => (c[0] as { folder: string }).folder)
    expect(carpetas).toEqual(["logos", "banners", "marcas", "productos"])
  })

  it("clasifica el banner de video como video", async () => {
    findSources.mockResolvedValue({
      logos: [], banners: [{ imageUrl: "/banners/b.mp4", title: "Promo", mediaType: "video" }], brands: [], productImages: [],
    } as never)
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    await autoSyncExistingAssets()

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ fileType: "video" }))
  })

  it("deriva el nombre del archivo del título, en minúsculas y con guiones", async () => {
    findSources.mockResolvedValue({
      logos: [], banners: [], brands: [{ logoUrl: "/marcas/nb.png", name: "New Balance" }], productImages: [],
    } as never)
    findByUrl.mockResolvedValue(null)
    create.mockResolvedValue(asset() as never)

    await autoSyncExistingAssets()

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "new-balance-logo.png" })
    )
  })

  it("omite los recursos que ya estaban registrados", async () => {
    findSources.mockResolvedValue({
      logos: [{ url: "/logos/a.svg", type: "desktop" }], banners: [], brands: [], productImages: [],
    } as never)
    findByUrl.mockResolvedValue(asset() as never)

    expect(await autoSyncExistingAssets()).toBe(0)
    expect(create).not.toHaveBeenCalled()
  })

  it("carga las fuentes de recursos desde el repositorio", async () => {
    await autoSyncExistingAssets()

    expect(findSources).toHaveBeenCalledOnce()
  })
})
