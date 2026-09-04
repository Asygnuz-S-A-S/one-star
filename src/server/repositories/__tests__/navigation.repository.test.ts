import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  aggregate: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  transaction: vi.fn(async (ops: unknown[]) => ops),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    navigationItem: {
      findMany: m.findMany,
      aggregate: m.aggregate,
      create: m.create,
      update: m.update,
      delete: m.del,
    },
    $transaction: m.transaction,
  },
}))

import {
  createNavigationItem,
  deleteNavigationItem,
  getActiveNavigationItems,
  getAllNavigationItems,
  getMaximumNavigationPosition,
  updateNavigationItem,
  updateNavigationPositions,
} from "../navigation.repository"

beforeEach(() => vi.clearAllMocks())

describe("navigation.repository", () => {
  it("el menú público solo trae ítems activos, ordenados por posición", async () => {
    m.findMany.mockResolvedValue([])

    await getActiveNavigationItems()

    expect(m.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { position: "asc" },
    })
  })

  it("el listado del admin incluye los inactivos", async () => {
    m.findMany.mockResolvedValue([])

    await getAllNavigationItems()

    expect(m.findMany).toHaveBeenCalledWith({ orderBy: { position: "asc" } })
  })

  it("devuelve la posición máxima actual", async () => {
    m.aggregate.mockResolvedValue({ _max: { position: 7 } })

    expect(await getMaximumNavigationPosition()).toBe(7)
  })

  it("devuelve 0 cuando el menú está vacío, para que el primer ítem quede en 1", async () => {
    m.aggregate.mockResolvedValue({ _max: { position: null } })

    expect(await getMaximumNavigationPosition()).toBe(0)
  })

  it("crea, actualiza y elimina por id", async () => {
    m.create.mockResolvedValue({ id: "nav_1" })
    m.update.mockResolvedValue({ id: "nav_1" })
    m.del.mockResolvedValue({ id: "nav_1" })

    await createNavigationItem({ label: "SALE", href: "/sale" } as never)
    await updateNavigationItem("nav_1", { label: "OFERTAS" })
    await deleteNavigationItem("nav_1")

    expect(m.create).toHaveBeenCalledWith({ data: { label: "SALE", href: "/sale" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "nav_1" }, data: { label: "OFERTAS" } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "nav_1" } })
  })

  it("reordena todas las posiciones dentro de una sola transacción", async () => {
    m.update.mockResolvedValue({})

    await updateNavigationPositions([
      { id: "nav_1", position: 2 },
      { id: "nav_2", position: 1 },
    ])

    expect(m.transaction).toHaveBeenCalledTimes(1)
    expect(m.update).toHaveBeenCalledTimes(2)
    expect(m.update).toHaveBeenCalledWith({ where: { id: "nav_2" }, data: { position: 1 } })
  })
})
