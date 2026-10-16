import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    storeLogo: {
      findMany: m.findMany,
      create: m.create,
      update: m.update,
      updateMany: m.updateMany,
      delete: m.del,
    },
  },
}))

import {
  addStoreLogo,
  deleteStoreLogo,
  getAllStoreLogos,
  getPrimaryLogos,
  setPrimaryStoreLogo,
  updateStoreLogoTheme,
} from "../site-logo.repository"

beforeEach(() => vi.clearAllMocks())

describe("getAllStoreLogos", () => {
  it("devuelve los logos más recientes primero", async () => {
    m.findMany.mockResolvedValue([])

    await getAllStoreLogos()

    expect(m.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } })
  })
})

describe("getPrimaryLogos", () => {
  it("reparte los principales por tipo", async () => {
    m.findMany.mockResolvedValue([
      { id: "l1", type: "desktop" },
      { id: "l2", type: "mobile" },
    ])

    expect(await getPrimaryLogos()).toEqual({
      desktop: { id: "l1", type: "desktop" },
      mobile: { id: "l2", type: "mobile" },
      large: null,
    })
    expect(m.findMany).toHaveBeenCalledWith({ where: { isPrimary: true } })
  })

  it("devuelve null en los tipos sin logo principal", async () => {
    m.findMany.mockResolvedValue([])

    expect(await getPrimaryLogos()).toEqual({ desktop: null, mobile: null, large: null })
  })
})

describe("addStoreLogo", () => {
  it("al marcar uno como principal quita el principal anterior del mismo tipo", async () => {
    m.updateMany.mockResolvedValue({ count: 1 })
    m.create.mockResolvedValue({ id: "logo_1" })

    await addStoreLogo({
      url: "/logos/logopositivo.svg",
      type: "desktop",
      theme: "light",
      isPrimary: true,
    })

    expect(m.updateMany).toHaveBeenCalledWith({
      where: { type: "desktop", isPrimary: true },
      data: { isPrimary: false },
    })
    expect(m.create).toHaveBeenCalled()
  })

  it("no toca los demás logos cuando el nuevo no es principal", async () => {
    m.create.mockResolvedValue({ id: "logo_2" })

    await addStoreLogo({
      url: "/logos/logonegativo.svg",
      type: "mobile",
      theme: "dark",
      isPrimary: false,
    })

    expect(m.updateMany).not.toHaveBeenCalled()
  })
})

describe("setPrimaryStoreLogo", () => {
  it("deja un único principal por tipo", async () => {
    m.updateMany.mockResolvedValue({ count: 1 })
    m.update.mockResolvedValue({ id: "logo_1" })

    await setPrimaryStoreLogo("logo_1", "desktop")

    expect(m.updateMany).toHaveBeenCalledWith({
      where: { type: "desktop", isPrimary: true },
      data: { isPrimary: false },
    })
    expect(m.update).toHaveBeenCalledWith({
      where: { id: "logo_1" },
      data: { isPrimary: true },
    })
  })
})

describe("updateStoreLogoTheme y deleteStoreLogo", () => {
  it("actualiza el tema", async () => {
    m.update.mockResolvedValue({ id: "logo_1" })

    await updateStoreLogoTheme("logo_1", "dark")

    expect(m.update).toHaveBeenCalledWith({ where: { id: "logo_1" }, data: { theme: "dark" } })
  })

  it("elimina por id", async () => {
    m.del.mockResolvedValue({ id: "logo_1" })

    await deleteStoreLogo("logo_1")

    expect(m.del).toHaveBeenCalledWith({ where: { id: "logo_1" } })
  })
})
