import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/landing-section.repository", () => ({
  getAllLandingSections: vi.fn(),
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
})

describe("deleteLandingSection", () => {
  it("delega la eliminación", async () => {
    vi.mocked(repository.deleteLandingSection).mockResolvedValue({ id: "sec_1" } as never)

    await service.deleteLandingSection("sec_1")

    expect(repository.deleteLandingSection).toHaveBeenCalledWith("sec_1")
  })
})
