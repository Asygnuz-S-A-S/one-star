import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/brand.repository", () => ({
  findManyBrands: vi.fn(),
  findBrandById: vi.fn(),
  createBrandRecord: vi.fn(),
  updateBrandRecord: vi.fn(),
  deleteBrandRecord: vi.fn(),
}))

import {
  createBrand,
  deleteBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
} from "../brand.service"
import {
  createBrandRecord,
  deleteBrandRecord,
  findBrandById,
  findManyBrands,
  updateBrandRecord,
} from "@/server/repositories/brand.repository"

const findMany = vi.mocked(findManyBrands)
const findById = vi.mocked(findBrandById)
const create = vi.mocked(createBrandRecord)
const update = vi.mocked(updateBrandRecord)
const remove = vi.mocked(deleteBrandRecord)

function marca(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "brand_1",
    name: "New Balance",
    slug: "new-balance",
    erpId: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe("getAllBrands", () => {
  it("devuelve solo los campos del DTO, sin metadatos de la tabla", async () => {
    findMany.mockResolvedValue([marca()] as never)

    expect(await getAllBrands()).toEqual([
      { id: "brand_1", name: "New Balance", slug: "new-balance", erpId: null, logoUrl: null, isActive: true },
    ])
  })

  it("sin argumentos pide todas las marcas", async () => {
    findMany.mockResolvedValue([])

    await getAllBrands()

    expect(findMany).toHaveBeenCalledWith(undefined)
  })

  it("filtra por activas cuando se pide", async () => {
    findMany.mockResolvedValue([])

    await getAllBrands(true)

    expect(findMany).toHaveBeenCalledWith({ isActive: true })
  })
})

describe("getBrandById", () => {
  it("devuelve null cuando la marca no existe", async () => {
    findById.mockResolvedValue(null)

    expect(await getBrandById("desconocida")).toBeNull()
  })

  it("mapea la marca encontrada", async () => {
    findById.mockResolvedValue(marca({ erpId: "erp-9" }) as never)

    expect(await getBrandById("brand_1")).toMatchObject({ erpId: "erp-9" })
  })
})

describe("createBrand", () => {
  it("deriva el slug del nombre cuando no se envía", async () => {
    create.mockResolvedValue(marca() as never)

    await createBrand({ name: "New Balance" })

    expect(create).toHaveBeenCalledWith({
      name: "New Balance",
      slug: "new-balance",
      logoUrl: null,
      isActive: true,
    })
  })

  it("respeta el slug explícito", async () => {
    create.mockResolvedValue(marca() as never)

    await createBrand({ name: "New Balance", slug: "nb" })

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ slug: "nb" }))
  })

  it("permite crear la marca desactivada", async () => {
    create.mockResolvedValue(marca({ isActive: false }) as never)

    await createBrand({ name: "Veja", isActive: false })

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
  })
})

describe("updateBrand", () => {
  it("solo envía los campos presentes, para no pisar los demás con undefined", async () => {
    update.mockResolvedValue(marca() as never)

    await updateBrand("brand_1", { isActive: false })

    expect(update).toHaveBeenCalledWith("brand_1", { isActive: false })
  })

  it("recalcula el slug cuando cambia el nombre", async () => {
    update.mockResolvedValue(marca() as never)

    await updateBrand("brand_1", { name: "Air Jordan" })

    expect(update).toHaveBeenCalledWith("brand_1", {
      name: "Air Jordan",
      slug: "air-jordan",
    })
  })

  it("permite borrar el logo enviando null", async () => {
    update.mockResolvedValue(marca() as never)

    await updateBrand("brand_1", { logoUrl: null })

    expect(update).toHaveBeenCalledWith("brand_1", { logoUrl: null })
  })
})

describe("deleteBrand", () => {
  it("delega la eliminación al repositorio", async () => {
    remove.mockResolvedValue(undefined as never)

    await deleteBrand("brand_1")

    expect(remove).toHaveBeenCalledWith("brand_1")
  })
})
