import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  transaction: vi.fn(async (ops: unknown[]) => ops),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    homeGridBlock: {
      findMany: m.findMany,
      findUnique: m.findUnique,
      create: m.create,
      update: m.update,
      delete: m.del,
    },
    $transaction: m.transaction,
  },
}))

import {
  createGridBlock,
  deleteGridBlock,
  getAllGridBlocks,
  getGridBlockById,
  getVisibleGridBlocks,
  updateGridBlock,
  updateGridBlocksPositions,
} from "../home-grid.repository"

beforeEach(() => vi.clearAllMocks())

describe("home-grid.repository", () => {
  it("la grilla pública solo muestra bloques activos", async () => {
    m.findMany.mockResolvedValue([])

    await getVisibleGridBlocks()

    expect(m.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { position: "asc" },
    })
  })

  it("el admin ve también los bloques desactivados", async () => {
    m.findMany.mockResolvedValue([])

    await getAllGridBlocks()

    expect(m.findMany).toHaveBeenCalledWith({ orderBy: { position: "asc" } })
  })

  it("busca un bloque por id", async () => {
    m.findUnique.mockResolvedValue(null)

    expect(await getGridBlockById("blk_1")).toBeNull()
    expect(m.findUnique).toHaveBeenCalledWith({ where: { id: "blk_1" } })
  })

  it("crea, actualiza y elimina bloques", async () => {
    m.create.mockResolvedValue({ id: "blk_1" })
    m.update.mockResolvedValue({ id: "blk_1" })
    m.del.mockResolvedValue({ id: "blk_1" })

    await createGridBlock({ label: "SALE", href: "/sale" } as never)
    await updateGridBlock("blk_1", { label: "OFERTAS" })
    await deleteGridBlock("blk_1")

    expect(m.create).toHaveBeenCalledWith({ data: { label: "SALE", href: "/sale" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "blk_1" }, data: { label: "OFERTAS" } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "blk_1" } })
  })

  it("reordena en una sola transacción", async () => {
    m.update.mockResolvedValue({})

    await updateGridBlocksPositions([{ id: "blk_1", position: 3 }])

    expect(m.transaction).toHaveBeenCalledTimes(1)
    expect(m.update).toHaveBeenCalledWith({ where: { id: "blk_1" }, data: { position: 3 } })
  })
})
