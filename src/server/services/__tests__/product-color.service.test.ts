import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/product-color.repository", () => ({
  findManyProductColors: vi.fn(),
  findProductColorByName: vi.fn(),
  createProductColorRecord: vi.fn(),
  updateProductColorRecord: vi.fn(),
  deleteProductColorRecord: vi.fn(),
  countVariantsUsingColor: vi.fn(),
  getMaxProductColorPosition: vi.fn(),
}))

import {
  createProductColor,
  deleteProductColor,
  getActiveProductColors,
  getColorPalette,
  getProductColorsForAdmin,
  updateProductColor,
} from "../product-color.service"
import {
  countVariantsUsingColor,
  createProductColorRecord,
  deleteProductColorRecord,
  findManyProductColors,
  findProductColorByName,
  getMaxProductColorPosition,
  updateProductColorRecord,
} from "@/server/repositories/product-color.repository"

const findMany = vi.mocked(findManyProductColors)
const findByName = vi.mocked(findProductColorByName)
const create = vi.mocked(createProductColorRecord)
const update = vi.mocked(updateProductColorRecord)
const remove = vi.mocked(deleteProductColorRecord)
const countUsage = vi.mocked(countVariantsUsingColor)
const maxPosition = vi.mocked(getMaxProductColorPosition)

function color(overrides: Record<string, unknown> = {}) {
  return {
    id: "col_1",
    name: "Rojo",
    hex: "#E31C23",
    position: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe("getProductColorsForAdmin", () => {
  it("incluye inactivos y cuenta cuántas variantes usan cada color", async () => {
    findMany.mockResolvedValue([color(), color({ id: "col_2", name: "Negro", isActive: false })] as never)
    countUsage.mockResolvedValueOnce(4).mockResolvedValueOnce(0)

    const colores = await getProductColorsForAdmin()

    expect(findMany).toHaveBeenCalledWith(false)
    expect(colores).toEqual([
      { id: "col_1", name: "Rojo", hex: "#E31C23", position: 0, isActive: true, usageCount: 4 },
      { id: "col_2", name: "Negro", hex: "#E31C23", position: 0, isActive: false, usageCount: 0 },
    ])
  })
})

describe("getActiveProductColors", () => {
  it("pide solo los activos y no calcula uso", async () => {
    findMany.mockResolvedValue([color()] as never)

    const colores = await getActiveProductColors()

    expect(findMany).toHaveBeenCalledWith(true)
    expect(colores[0]).not.toHaveProperty("usageCount")
    expect(countUsage).not.toHaveBeenCalled()
  })
})

describe("getColorPalette", () => {
  it("arma el mapa nombre → hex que consumen los componentes de cliente", async () => {
    findMany.mockResolvedValue([
      color(),
      color({ id: "col_2", name: "Negro", hex: "#1C1C1C" }),
    ] as never)

    expect(await getColorPalette()).toEqual({ Rojo: "#E31C23", Negro: "#1C1C1C" })
  })

  it("incluye también los inactivos, para que las variantes viejas sigan dibujándose", async () => {
    findMany.mockResolvedValue([])

    await getColorPalette()

    expect(findMany).toHaveBeenCalledWith(false)
  })
})

describe("createProductColor", () => {
  it("asigna la posición siguiente a la última", async () => {
    findByName.mockResolvedValue(null)
    maxPosition.mockResolvedValue(3)
    create.mockResolvedValue(color({ position: 4 }) as never)

    await createProductColor({ name: "Rojo", hex: "#E31C23", isActive: true })

    expect(create).toHaveBeenCalledWith({
      name: "Rojo",
      hex: "#E31C23",
      isActive: true,
      position: 4,
    })
  })

  it("rechaza un nombre duplicado en lugar de crear un color repetido", async () => {
    findByName.mockResolvedValue(color() as never)

    await expect(
      createProductColor({ name: "Rojo", hex: "#000000", isActive: true })
    ).rejects.toThrow('Ya existe un color llamado "Rojo"')
    expect(create).not.toHaveBeenCalled()
  })
})

describe("updateProductColor", () => {
  it("permite renombrar un color conservando su propio nombre", async () => {
    findByName.mockResolvedValue(color() as never)
    update.mockResolvedValue(color() as never)

    await updateProductColor("col_1", { name: "Rojo", hex: "#AA0000", isActive: true })

    expect(update).toHaveBeenCalledWith("col_1", {
      name: "Rojo",
      hex: "#AA0000",
      isActive: true,
    })
  })

  it("rechaza tomar el nombre de otro color existente", async () => {
    findByName.mockResolvedValue(color({ id: "col_9" }) as never)

    await expect(
      updateProductColor("col_1", { name: "Rojo", hex: "#AA0000", isActive: true })
    ).rejects.toThrow('Ya existe otro color llamado "Rojo"')
    expect(update).not.toHaveBeenCalled()
  })
})

describe("deleteProductColor", () => {
  it("elimina el color de la paleta sin tocar las variantes que lo usaban", async () => {
    remove.mockResolvedValue(undefined as never)

    await deleteProductColor("col_1")

    expect(remove).toHaveBeenCalledWith("col_1")
  })
})
