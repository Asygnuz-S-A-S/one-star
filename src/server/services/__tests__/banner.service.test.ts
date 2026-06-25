import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/banner.repository", () => ({
  findManyBanners: vi.fn(),
  getActiveBanners: vi.fn(),
  createBannerRecord: vi.fn(),
  updateBannerRecord: vi.fn(),
  deleteBannerRecord: vi.fn(),
}))

import {
  getAllBanners,
  getVisibleBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerActive,
} from "../banner.service"
import {
  findManyBanners,
  getActiveBanners,
  createBannerRecord,
  updateBannerRecord,
  deleteBannerRecord,
} from "@/server/repositories/banner.repository"

const mockFindMany = vi.mocked(findManyBanners)
const mockGetActive = vi.mocked(getActiveBanners)
const mockCreate = vi.mocked(createBannerRecord)
const mockUpdate = vi.mocked(updateBannerRecord)
const mockDelete = vi.mocked(deleteBannerRecord)

const rawBanner = {
  id: "banner-1",
  title: "Sale de verano",
  imageUrl: "/banner.jpg",
  linkUrl: "/sale",
  position: 0,
  isActive: true,
  startDate: new Date("2024-01-01"),
  endDate: new Date("2024-12-31"),
  createdAt: new Date("2024-01-01"),
}

describe("getAllBanners", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna la lista de banners mapeados a DTO", async () => {
    mockFindMany.mockResolvedValue([rawBanner])
    const result = await getAllBanners()
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe("Sale de verano")
    expect(result[0].imageUrl).toBe("/banner.jpg")
  })

  it("convierte fechas a ISO string", async () => {
    mockFindMany.mockResolvedValue([rawBanner])
    const result = await getAllBanners()
    expect(result[0].startDate).toBe("2024-01-01T00:00:00.000Z")
    expect(result[0].endDate).toBe("2024-12-31T00:00:00.000Z")
  })

  it("retorna arreglo vacío cuando no hay banners", async () => {
    mockFindMany.mockResolvedValue([])
    const result = await getAllBanners()
    expect(result).toEqual([])
  })
})

describe("getVisibleBanners", () => {
  it("delega a getActiveBanners del repositorio", async () => {
    mockGetActive.mockResolvedValue([rawBanner])
    const result = await getVisibleBanners()
    expect(result).toHaveLength(1)
    expect(mockGetActive).toHaveBeenCalledTimes(1)
  })
})

describe("createBanner", () => {
  beforeEach(() => vi.clearAllMocks())

  it("crea banner con valores por defecto cuando no se pasan opcionales", async () => {
    mockCreate.mockResolvedValue(rawBanner)
    await createBanner({ title: "Nuevo", imageUrl: "/new.jpg" })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ position: 0, isActive: true, linkUrl: null })
    )
  })

  it("convierte startDate/endDate string a Date", async () => {
    mockCreate.mockResolvedValue(rawBanner)
    await createBanner({
      title: "Nuevo",
      imageUrl: "/new.jpg",
      startDate: "2024-06-01",
      endDate: "2024-08-31",
    })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-08-31"),
      })
    )
  })

  it("retorna el DTO del banner creado", async () => {
    mockCreate.mockResolvedValue(rawBanner)
    const result = await createBanner({ title: "Nuevo", imageUrl: "/new.jpg" })
    expect(result.id).toBe("banner-1")
    expect(result.title).toBe("Sale de verano")
  })
})

describe("updateBanner", () => {
  it("llama al repositorio con el id y los datos actualizados", async () => {
    mockUpdate.mockResolvedValue(rawBanner)
    await updateBanner("banner-1", { title: "Actualizado", imageUrl: "/updated.jpg" })
    expect(mockUpdate).toHaveBeenCalledWith(
      "banner-1",
      expect.objectContaining({ title: "Actualizado" })
    )
  })
})

describe("deleteBanner", () => {
  it("llama al repositorio con el id correcto", async () => {
    mockDelete.mockResolvedValue(undefined as never)
    await deleteBanner("banner-1")
    expect(mockDelete).toHaveBeenCalledWith("banner-1")
  })
})

describe("toggleBannerActive", () => {
  it("desactiva un banner activo", async () => {
    mockUpdate.mockResolvedValue({ ...rawBanner, isActive: false })
    await toggleBannerActive("banner-1", true)
    expect(mockUpdate).toHaveBeenCalledWith("banner-1", { isActive: false })
  })

  it("activa un banner inactivo", async () => {
    mockUpdate.mockResolvedValue(rawBanner)
    await toggleBannerActive("banner-1", false)
    expect(mockUpdate).toHaveBeenCalledWith("banner-1", { isActive: true })
  })
})
