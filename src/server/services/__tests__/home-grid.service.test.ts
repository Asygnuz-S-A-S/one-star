import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/home-grid.repository", () => ({
  getVisibleGridBlocks: vi.fn(),
  getAllGridBlocks: vi.fn(),
  getGridBlockById: vi.fn(),
  createGridBlock: vi.fn(),
  updateGridBlock: vi.fn(),
  deleteGridBlock: vi.fn(),
  updateGridBlocksPositions: vi.fn(),
}))

import * as service from "../home-grid.service"
import * as repo from "@/server/repositories/home-grid.repository"

const bloque = {
  label: "SALE",
  href: "/sale",
  bgColor: "bg-[#E31C23]",
  emoji: "%",
  darkText: false,
  isActive: true,
}

beforeEach(() => vi.clearAllMocks())

describe("lecturas", () => {
  it("expone los bloques visibles y todos por separado", async () => {
    vi.mocked(repo.getVisibleGridBlocks).mockResolvedValue([] as never)
    vi.mocked(repo.getAllGridBlocks).mockResolvedValue([] as never)
    vi.mocked(repo.getGridBlockById).mockResolvedValue(null)

    await service.getVisibleGridBlocks()
    await service.getAllGridBlocks()
    await service.getGridBlockById("blk_1")

    expect(repo.getVisibleGridBlocks).toHaveBeenCalled()
    expect(repo.getAllGridBlocks).toHaveBeenCalled()
    expect(repo.getGridBlockById).toHaveBeenCalledWith("blk_1")
  })
})

describe("createGridBlock", () => {
  it("coloca el bloque nuevo después del último cuando no se indica posición", async () => {
    vi.mocked(repo.getAllGridBlocks).mockResolvedValue([
      { position: 0 },
      { position: 3 },
    ] as never)
    vi.mocked(repo.createGridBlock).mockResolvedValue({ id: "blk_1" } as never)

    await service.createGridBlock(bloque as never)

    expect(repo.createGridBlock).toHaveBeenCalledWith(
      expect.objectContaining({ position: 4 })
    )
  })

  it("empieza en 0 cuando la grilla está vacía", async () => {
    vi.mocked(repo.getAllGridBlocks).mockResolvedValue([] as never)
    vi.mocked(repo.createGridBlock).mockResolvedValue({ id: "blk_1" } as never)

    await service.createGridBlock(bloque as never)

    expect(repo.createGridBlock).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }))
  })

  it("rechaza un bloque sin los campos obligatorios", async () => {
    await expect(service.createGridBlock({ href: "/sale" } as never)).rejects.toThrow()
    expect(repo.createGridBlock).not.toHaveBeenCalled()
  })
})

describe("updateGridBlock", () => {
  it("solo escribe los campos enviados", async () => {
    vi.mocked(repo.updateGridBlock).mockResolvedValue({ id: "blk_1" } as never)

    await service.updateGridBlock("blk_1", { label: "OFERTAS" })

    expect(repo.updateGridBlock).toHaveBeenCalledWith("blk_1", { label: "OFERTAS" })
  })

  it("alternar la visibilidad no reinicia la posición del bloque", async () => {
    vi.mocked(repo.updateGridBlock).mockResolvedValue({ id: "blk_1" } as never)

    // Es lo que hace toggleGridBlockActive en src/server/actions/home-grid.actions.ts.
    // Los `.default()` del esquema sobrevivían a `.partial()` y mandaban
    // position: 0, desordenando la grilla del inicio.
    await service.updateGridBlock("blk_1", { isActive: false })

    const enviado = vi.mocked(repo.updateGridBlock).mock.calls[0][1]
    expect(enviado).toEqual({ isActive: false })
    expect(enviado).not.toHaveProperty("position")
    expect(enviado).not.toHaveProperty("darkText")
  })

  it("acepta actualizar varios campos a la vez", async () => {
    vi.mocked(repo.updateGridBlock).mockResolvedValue({ id: "blk_1" } as never)

    await service.updateGridBlock("blk_1", { label: "SALE", position: 3 })

    expect(repo.updateGridBlock).toHaveBeenCalledWith("blk_1", {
      label: "SALE",
      position: 3,
    })
  })
})

describe("deleteGridBlock y updateGridBlocksPositions", () => {
  it("delegan en el repositorio", async () => {
    vi.mocked(repo.deleteGridBlock).mockResolvedValue({ id: "blk_1" } as never)
    vi.mocked(repo.updateGridBlocksPositions).mockResolvedValue(undefined as never)

    await service.deleteGridBlock("blk_1")
    await service.updateGridBlocksPositions([{ id: "blk_1", position: 1 }])

    expect(repo.deleteGridBlock).toHaveBeenCalledWith("blk_1")
    expect(repo.updateGridBlocksPositions).toHaveBeenCalledWith([{ id: "blk_1", position: 1 }])
  })
})
