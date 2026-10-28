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
    landingSection: {
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
  createLandingSection,
  deleteLandingSection,
  getActiveLandingSections,
  getAllLandingSections,
  getMaximumLandingSectionPosition,
  publishLandingDrafts,
  updateLandingSection,
  updateLandingSectionPositions,
} from "../landing-section.repository"
import { Prisma } from "@prisma/client"

const ordenEstable = [{ position: "asc" }, { createdAt: "asc" }]

beforeEach(() => vi.clearAllMocks())

describe("landing-section.repository", () => {
  it("la landing pública solo muestra secciones activas, con orden determinista", async () => {
    m.findMany.mockResolvedValue([])

    await getActiveLandingSections()

    expect(m.findMany).toHaveBeenCalledWith({
      where: { page: "home", isActive: true },
      orderBy: ordenEstable,
    })
  })

  it("cada landing de campaña solo ve sus propias secciones", async () => {
    m.findMany.mockResolvedValue([])

    await getActiveLandingSections("hoka-running")
    await getAllLandingSections("hoka-running")

    expect(m.findMany).toHaveBeenNthCalledWith(1, { where: { page: "hoka-running", isActive: true }, orderBy: ordenEstable })
    expect(m.findMany).toHaveBeenNthCalledWith(2, { where: { page: "hoka-running" }, orderBy: ordenEstable })
  })

  it("el builder ve también las secciones desactivadas", async () => {
    m.findMany.mockResolvedValue([])

    await getAllLandingSections()

    expect(m.findMany).toHaveBeenCalledWith({ where: { page: "home" }, orderBy: ordenEstable })
  })

  it("reordena todas las secciones en una sola transacción", async () => {
    m.update.mockResolvedValue({})

    await updateLandingSectionPositions([
      { id: "sec_1", position: 1 },
      { id: "sec_2", position: 0 },
    ])

    expect(m.transaction).toHaveBeenCalledTimes(1)
    expect(m.update).toHaveBeenCalledTimes(2)
  })

  it("devuelve 0 como posición máxima cuando no hay secciones", async () => {
    m.aggregate.mockResolvedValue({ _max: { position: null } })

    expect(await getMaximumLandingSectionPosition()).toBe(0)
  })

  it("devuelve la posición máxima existente", async () => {
    m.aggregate.mockResolvedValue({ _max: { position: 4 } })

    expect(await getMaximumLandingSectionPosition()).toBe(4)
  })

  it("crea, actualiza y elimina secciones por id", async () => {
    m.create.mockResolvedValue({ id: "sec_1" })
    m.update.mockResolvedValue({ id: "sec_1" })
    m.del.mockResolvedValue({ id: "sec_1" })

    await createLandingSection({ type: "HERO" } as never)
    await updateLandingSection("sec_1", { isActive: false })
    await deleteLandingSection("sec_1")

    expect(m.create).toHaveBeenCalledWith({ data: { type: "HERO" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "sec_1" }, data: { isActive: false } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "sec_1" } })
  })

  it("publica solo las secciones que tienen borrador", async () => {
    m.findMany.mockResolvedValue([
      { id: "a", draftConfig: { title: "Nuevo" } },
      { id: "b", draftConfig: null },
    ])
    m.update.mockResolvedValue({})

    expect(await publishLandingDrafts("home")).toBe(1)

    expect(m.update).toHaveBeenCalledTimes(1)
    expect(m.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { config: { title: "Nuevo" }, draftConfig: Prisma.DbNull },
    })
  })
})
