import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  variantCount: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    productColor: {
      findMany: m.findMany,
      findUnique: m.findUnique,
      findFirst: m.findFirst,
      create: m.create,
      update: m.update,
      delete: m.del,
    },
    variant: { count: m.variantCount },
  },
}))

import {
  countVariantsUsingColor,
  createProductColorRecord,
  deleteProductColorRecord,
  findManyProductColors,
  findProductColorByName,
  getMaxProductColorPosition,
  updateProductColorRecord,
} from "../product-color.repository"

beforeEach(() => vi.clearAllMocks())

describe("product-color.repository", () => {
  it("por defecto trae también los colores inactivos", async () => {
    m.findMany.mockResolvedValue([])

    await findManyProductColors()

    expect(m.findMany).toHaveBeenCalledWith({
      where: undefined,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    })
  })

  it("filtra por activos cuando se pide", async () => {
    m.findMany.mockResolvedValue([])

    await findManyProductColors(true)

    expect(m.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } })
    )
  })

  it("busca por nombre, que es la clave única", async () => {
    m.findUnique.mockResolvedValue(null)

    expect(await findProductColorByName("Rojo")).toBeNull()
    expect(m.findUnique).toHaveBeenCalledWith({ where: { name: "Rojo" } })
  })

  it("crea, actualiza y elimina colores", async () => {
    m.create.mockResolvedValue({ id: "col_1" })
    m.update.mockResolvedValue({ id: "col_1" })
    m.del.mockResolvedValue({ id: "col_1" })

    await createProductColorRecord({ name: "Rojo", hex: "#E31C23" } as never)
    await updateProductColorRecord("col_1", { hex: "#AA0000" })
    await deleteProductColorRecord("col_1")

    expect(m.create).toHaveBeenCalledWith({ data: { name: "Rojo", hex: "#E31C23" } })
    expect(m.update).toHaveBeenCalledWith({ where: { id: "col_1" }, data: { hex: "#AA0000" } })
    expect(m.del).toHaveBeenCalledWith({ where: { id: "col_1" } })
  })

  it("cuenta variantes por color sin distinguir mayúsculas", async () => {
    m.variantCount.mockResolvedValue(3)

    expect(await countVariantsUsingColor("rojo")).toBe(3)
    expect(m.variantCount).toHaveBeenCalledWith({
      where: { color: { contains: "rojo", mode: "insensitive" } },
    })
  })

  it("devuelve -1 como posición máxima cuando la paleta está vacía, para que el primero quede en 0", async () => {
    m.findFirst.mockResolvedValue(null)

    expect(await getMaxProductColorPosition()).toBe(-1)
  })

  it("devuelve la posición del último color", async () => {
    m.findFirst.mockResolvedValue({ position: 5 })

    expect(await getMaxProductColorPosition()).toBe(5)
  })
})
