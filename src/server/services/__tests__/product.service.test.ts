import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/product.repository", () => ({
  findManyProducts: vi.fn(),
  findProductBySlug: vi.fn(),
  findProductByIdForAdmin: vi.fn(),
  countProducts: vi.fn(),
  getUniqueBrands: vi.fn(),
  createProductRecord: vi.fn(),
  updateProductRecord: vi.fn(),
  deleteProductRecord: vi.fn(),
  deleteVariantsByProduct: vi.fn(),
  deleteImagesByProduct: vi.fn(),
  searchProductsByName: vi.fn(),
  runInTransaction: vi.fn(),
}))

import {
  getProducts,
  getProductBySlug,
  getUniqueBrands,
  deleteProduct,
  searchProducts,
} from "../product.service"
import {
  findManyProducts,
  findProductBySlug,
  countProducts,
  getUniqueBrands as fetchBrands,
  deleteProductRecord,
  searchProductsByName,
} from "@/server/repositories/product.repository"

const mockFindMany = vi.mocked(findManyProducts)
const mockFindBySlug = vi.mocked(findProductBySlug)
const mockCount = vi.mocked(countProducts)
const mockGetBrands = vi.mocked(fetchBrands)
const mockDelete = vi.mocked(deleteProductRecord)
const mockSearch = vi.mocked(searchProductsByName)

const makeDecimal = (n: number) => ({ toNumber: () => n })

const baseCategory = { id: "cat-1", name: "Zapatillas", slug: "zapatillas" }

const rawProduct = {
  id: "prod-1",
  slug: "nike-air-max",
  name: "Nike Air Max",
  brand: "Nike",
  basePrice: makeDecimal(150000),
  isOnSale: false,
  salePrice: null,
  description: "Zapatilla clásica",
  extendedDescription: null,
  videoUrl: null,
  metaTitle: null,
  metaDescription: null,
  gender: "MALE",
  categoryId: "cat-1",
  category: baseCategory,
  images: [{ id: "img-1", url: "/nike.jpg", alt: "Nike", position: 0 }],
  variants: [{ id: "var-1", sku: "NK-001", size: "42", color: "Negro", stock: 10, sizeUS: null, sizeCM: null, sizeEUR: null }],
  crossSells: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-06-01"),
}

describe("getProducts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna productos y total correctamente", async () => {
    mockFindMany.mockResolvedValue([rawProduct] as never)
    mockCount.mockResolvedValue(1)

    const result = await getProducts({})
    expect(result.total).toBe(1)
    expect(result.products).toHaveLength(1)
    expect(result.products[0].slug).toBe("nike-air-max")
  })

  it("convierte basePrice a número", async () => {
    mockFindMany.mockResolvedValue([rawProduct] as never)
    mockCount.mockResolvedValue(1)
    const { products } = await getProducts({})
    expect(products[0].basePrice).toBe(150000)
  })

  it("salePrice es null cuando no hay oferta", async () => {
    mockFindMany.mockResolvedValue([rawProduct] as never)
    mockCount.mockResolvedValue(1)
    const { products } = await getProducts({})
    expect(products[0].salePrice).toBeNull()
    expect(products[0].isOnSale).toBe(false)
  })

  it("filtra por página: skip correcto en página 2", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getProducts({ page: "2" }, 12)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      12,
      12
    )
  })

  it("la página mínima es 1 aunque se pase 0 o negativo", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await getProducts({ page: "0" }, 10)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      10,
      0
    )
  })
})

describe("getProductBySlug", () => {
  beforeEach(() => vi.clearAllMocks())

  it("retorna el DTO cuando el producto existe", async () => {
    mockFindBySlug.mockResolvedValue(rawProduct as never)
    const result = await getProductBySlug("nike-air-max")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Nike Air Max")
  })

  it("retorna null cuando el slug no existe", async () => {
    mockFindBySlug.mockResolvedValue(null)
    const result = await getProductBySlug("no-existe")
    expect(result).toBeNull()
  })

  it("incluye variantes y la categoría en el DTO", async () => {
    mockFindBySlug.mockResolvedValue(rawProduct as never)
    const result = await getProductBySlug("nike-air-max")
    expect(result!.variants).toHaveLength(1)
    expect(result!.category.slug).toBe("zapatillas")
  })
})

describe("getUniqueBrands", () => {
  it("delega directamente al repositorio", async () => {
    mockGetBrands.mockResolvedValue(["Nike", "Adidas"])
    const brands = await getUniqueBrands()
    expect(brands).toEqual(["Nike", "Adidas"])
  })
})

describe("deleteProduct", () => {
  it("llama al repositorio con el id correcto", async () => {
    mockDelete.mockResolvedValue(undefined as never)
    await deleteProduct("prod-1")
    expect(mockDelete).toHaveBeenCalledWith("prod-1")
  })
})

describe("searchProducts", () => {
  it("retorna resultados del repositorio", async () => {
    mockSearch.mockResolvedValue([{ id: "prod-1", name: "Nike Air Max", brand: "Nike" }])
    const result = await searchProducts("nike")
    expect(result[0].name).toBe("Nike Air Max")
  })

  it("pasa el excludeId al repositorio", async () => {
    mockSearch.mockResolvedValue([])
    await searchProducts("adidas", "prod-exclude")
    expect(mockSearch).toHaveBeenCalledWith("adidas", "prod-exclude")
  })
})
