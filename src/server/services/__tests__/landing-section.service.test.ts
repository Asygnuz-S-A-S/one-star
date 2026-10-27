import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/landing-section.repository", () => ({
  HOME_LANDING_PAGE: "home",
  getAllLandingSections: vi.fn(),
  getActiveLandingSections: vi.fn(),
  getLandingPages: vi.fn(),
  updateLandingSectionPositions: vi.fn(),
  updateLandingSection: vi.fn(),
  createLandingSection: vi.fn(),
  deleteLandingSection: vi.fn(),
  getMaximumLandingSectionPosition: vi.fn(),
}))

import * as service from "../landing-section.service"
import * as repository from "@/server/repositories/landing-section.repository"

beforeEach(() => vi.clearAllMocks())

describe("getAllLandingSections", () => {
  it("delega en el repositorio", async () => {
    vi.mocked(repository.getAllLandingSections).mockResolvedValue([] as never)

    expect(await service.getAllLandingSections()).toEqual([])
  })
})

describe("landings de campaña", () => {
  it("crea la sección en la landing indicada y numera dentro de ella", async () => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(1)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection("HERO", "hoka-running")

    expect(repository.getMaximumLandingSectionPosition).toHaveBeenCalledWith("hoka-running")
    expect(repository.createLandingSection).toHaveBeenCalledWith(expect.objectContaining({ page: "hoka-running", position: 2 }))
  })

  it("rechaza slugs inseguros antes de consultar", async () => {
    await expect(service.getActiveLandingSections("../admin")).rejects.toThrow()
    await expect(service.createLandingSection("HERO", "Hoka Running")).rejects.toThrow()
    expect(repository.getActiveLandingSections).not.toHaveBeenCalled()
    expect(repository.createLandingSection).not.toHaveBeenCalled()
  })

  it("siempre lista la home aunque aún no tenga secciones", async () => {
    vi.mocked(repository.getLandingPages).mockResolvedValue(["hoka-running"])
    expect(await service.getLandingPages()).toEqual(["home", "hoka-running"])

    vi.mocked(repository.getLandingPages).mockResolvedValue(["hoka-running", "home"])
    expect(await service.getLandingPages()).toEqual(["home", "hoka-running"])
  })
})

describe("updateLandingSectionPositions", () => {
  it("valida las posiciones antes de escribir", async () => {
    vi.mocked(repository.updateLandingSectionPositions).mockResolvedValue(undefined as never)

    await service.updateLandingSectionPositions([{ id: "sec_1", position: 2 }])

    expect(repository.updateLandingSectionPositions).toHaveBeenCalledWith([
      { id: "sec_1", position: 2 },
    ])
  })

  it("rechaza una posición que no es número", async () => {
    await expect(
      service.updateLandingSectionPositions([{ id: "sec_1", position: "dos" } as never])
    ).rejects.toThrow()
    expect(repository.updateLandingSectionPositions).not.toHaveBeenCalled()
  })
})

describe("setLandingSectionActive", () => {
  it("activa y desactiva una sección", async () => {
    vi.mocked(repository.updateLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.setLandingSectionActive("sec_1", false)

    expect(repository.updateLandingSection).toHaveBeenCalledWith("sec_1", { isActive: false })
  })
})

describe("createLandingSection", () => {
  it("rechaza un tipo de sección desconocido", async () => {
    await expect(service.createLandingSection("CARRUSEL_RARO")).rejects.toThrow()
    expect(repository.createLandingSection).not.toHaveBeenCalled()
  })

  it("coloca la sección nueva al final y activa", async () => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(3)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection("MEDIA_CAROUSEL")

    expect(repository.createLandingSection).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MEDIA_CAROUSEL", position: 4, isActive: true })
    )
  })

  it("el carrusel de medios nace con contenido de ejemplo para no quedar vacío", async () => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(0)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection("MEDIA_CAROUSEL")

    const config = vi.mocked(repository.createLandingSection).mock.calls[0][0]
      .config as Record<string, unknown>
    expect(config.title).toBe("PROMOS Y NOVEDADES")
    expect(Array.isArray(config.items)).toBe(true)
  })

  it.each([
    ["HERO", { kind: "campaignHero", version: 1 }],
    ["CATEGORY_GRID", { kind: "collectionTile", version: 1 }],
  ])("abre %s nuevo en el editor guiado, no en la configuración avanzada", async (type, expectedConfig) => {
    vi.mocked(repository.getMaximumLandingSectionPosition).mockResolvedValue(0)
    vi.mocked(repository.createLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.createLandingSection(type)

    expect(vi.mocked(repository.createLandingSection).mock.calls[0][0].config).toMatchObject(expectedConfig)
  })
})

describe("deleteLandingSection", () => {
  it("delega la eliminación", async () => {
    vi.mocked(repository.deleteLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.deleteLandingSection("sec_1")

    expect(repository.deleteLandingSection).toHaveBeenCalledWith("sec_1")
  })
})
