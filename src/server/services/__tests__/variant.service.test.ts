import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))

const catalogRules = vi.hoisted(() => ({ hideImagelessProducts: true }))
vi.mock("@/server/services/store-settings.service", () => ({
  getCatalogRules: vi.fn(async () => catalogRules),
}))
vi.mock("@/server/repositories/variant.repository", () => ({
  getUniqueSizes: vi.fn(),
  getUniqueColors: vi.fn(),
  countVariants: vi.fn(),
}))

import { getUniqueSizes, getUniqueColors, getTotalVariantsCount } from "../variant.service"
import {
  getUniqueSizes as fetchSizes,
  getUniqueColors as fetchColors,
  countVariants,
} from "@/server/repositories/variant.repository"

const mockSizes = vi.mocked(fetchSizes)
const mockColors = vi.mocked(fetchColors)
const mockCount = vi.mocked(countVariants)

describe("getUniqueSizes", () => {
  it("delega al repositorio y retorna las tallas", async () => {
    mockSizes.mockResolvedValue(["38", "40", "42", "44"])
    const result = await getUniqueSizes()
    expect(result).toEqual(["38", "40", "42", "44"])
    expect(mockSizes).toHaveBeenCalledTimes(1)
    expect(mockSizes).toHaveBeenCalledWith({ brandId: undefined, requireImage: true })
  })

  it("retorna arreglo vacío si no hay tallas", async () => {
    mockSizes.mockResolvedValue([])
    expect(await getUniqueSizes()).toEqual([])
  })
})

describe("getUniqueColors", () => {
  it("delega al repositorio y retorna los colores ordenados y sin duplicados por mayúsculas", async () => {
    mockColors.mockResolvedValue(["Negro", "Blanco", "NEGRO", "Rojo"])
    const result = await getUniqueColors()
    expect(result).toEqual(["Blanco", "Negro", "Rojo"])
    expect(mockColors).toHaveBeenCalledTimes(1)
    expect(mockColors).toHaveBeenCalledWith({ brandId: undefined, requireImage: true })
  })

  it("retorna arreglo vacío si no hay colores", async () => {
    mockColors.mockResolvedValue([])
    expect(await getUniqueColors()).toEqual([])
  })
})

describe("getTotalVariantsCount", () => {
  it("delega al repositorio y retorna el conteo", async () => {
    mockCount.mockResolvedValue(150)
    expect(await getTotalVariantsCount()).toBe(150)
  })
})

describe("facetas por marca", () => {
  it("acota tallas y colores a la marca y respeta la regla de ocultar productos sin foto", async () => {
    catalogRules.hideImagelessProducts = false
    mockSizes.mockResolvedValue(["42"])
    mockColors.mockResolvedValue(["Negro"])
    await getUniqueSizes("brand-hoka")
    await getUniqueColors("brand-hoka")
    expect(mockSizes).toHaveBeenLastCalledWith({ brandId: "brand-hoka", requireImage: false })
    expect(mockColors).toHaveBeenLastCalledWith({ brandId: "brand-hoka", requireImage: false })
    catalogRules.hideImagelessProducts = true
  })
})
