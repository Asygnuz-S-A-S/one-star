import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/navigation.repository", () => ({
  getAllNavigationItems: vi.fn(),
  getMaximumNavigationPosition: vi.fn(),
  createNavigationItem: vi.fn(),
  updateNavigationItem: vi.fn(),
  deleteNavigationItem: vi.fn(),
  updateNavigationPositions: vi.fn(),
}))

import * as service from "../navigation.service"
import * as repository from "@/server/repositories/navigation.repository"

const itemValido = { label: "SALE", href: "/sale", isSale: true, isActive: true }

beforeEach(() => vi.clearAllMocks())

describe("createNavigationItem", () => {
  it("coloca el ítem nuevo al final del menú", async () => {
    vi.mocked(repository.getMaximumNavigationPosition).mockResolvedValue(4)
    vi.mocked(repository.createNavigationItem).mockResolvedValue({ id: "nav_1" } as never)

    await service.createNavigationItem(itemValido as never)

    expect(repository.createNavigationItem).toHaveBeenCalledWith(
      expect.objectContaining({ position: 5 })
    )
  })

  it("rechaza un enlace ejecutable en lugar de guardarlo en el menú", async () => {
    await expect(
      service.createNavigationItem({ ...itemValido, href: "javascript:alert(1)" } as never)
    ).rejects.toThrow()
    expect(repository.createNavigationItem).not.toHaveBeenCalled()
  })
})

describe("updateNavigationItem", () => {
  it("valida antes de escribir", async () => {
    vi.mocked(repository.updateNavigationItem).mockResolvedValue({ id: "nav_1" } as never)

    await service.updateNavigationItem("nav_1", itemValido as never)

    expect(repository.updateNavigationItem).toHaveBeenCalledWith(
      "nav_1",
      expect.objectContaining({ label: "SALE" })
    )
  })
})

describe("setNavigationItemActive", () => {
  it("solo cambia la visibilidad, sin tocar el resto del ítem", async () => {
    vi.mocked(repository.updateNavigationItem).mockResolvedValue({ id: "nav_1" } as never)

    await service.setNavigationItemActive("nav_1", false)

    expect(repository.updateNavigationItem).toHaveBeenCalledWith("nav_1", { isActive: false })
  })
})

describe("deleteNavigationItem y updateNavigationPositions", () => {
  it("delegan en el repositorio, validando el reordenamiento", async () => {
    vi.mocked(repository.deleteNavigationItem).mockResolvedValue({ id: "nav_1" } as never)
    vi.mocked(repository.updateNavigationPositions).mockResolvedValue(undefined as never)

    await service.deleteNavigationItem("nav_1")
    await service.updateNavigationPositions([{ id: "nav_1", position: 2 }])

    expect(repository.deleteNavigationItem).toHaveBeenCalledWith("nav_1")
    expect(repository.updateNavigationPositions).toHaveBeenCalledWith([
      { id: "nav_1", position: 2 },
    ])
  })
})

describe("getAllNavigationItems", () => {
  it("delega la lectura", async () => {
    vi.mocked(repository.getAllNavigationItems).mockResolvedValue([] as never)

    expect(await service.getAllNavigationItems()).toEqual([])
  })
})
