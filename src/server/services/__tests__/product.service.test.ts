import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/product.repository", () => ({
  findManyProducts: vi.fn(),
  findProductCatalogCandidates: vi.fn(),
  findProductsByIds: vi.fn(),
  findProductBySlug: vi.fn(),
  findProductByIdForAdmin: vi.fn(),
  countProducts: vi.fn(),
  fetchBrands: vi.fn(),
  createProductRecord: vi.fn(),
  updateProductRecord: vi.fn(),
  deleteProductRecord: vi.fn(),
  deleteVariantsByProduct: vi.fn(),
  deleteImagesByProduct: vi.fn(),
  searchProductsByName: vi.fn(),
  runInTransaction: vi.fn(),
  updateProductWithAdminRelations: vi.fn(),
}))

import {
  getAdminProducts,
  getProducts,
  getProductBySlug,
  getUniqueBrands,
  deleteProduct,
  searchProducts,
  updateProduct,
} from "../product.service"
import {
  findManyProducts,
  findProductCatalogCandidates,
  findProductsByIds,
  findProductBySlug,
  fetchBrands,
  deleteProductRecord,
  searchProductsByName,
  updateProductWithAdminRelations,
  countProducts,
} from "@/server/repositories/product.repository"

const mockFindManyProducts = vi.mocked(findManyProducts)
const mockFindCatalogCandidates = vi.mocked(findProductCatalogCandidates)
const mockFindProductsByIds = vi.mocked(findProductsByIds)
const mockFindBySlug = vi.mocked(findProductBySlug)
const mockGetBrands = vi.mocked(fetchBrands)
const mockDelete = vi.mocked(deleteProductRecord)
const mockSearch = vi.mocked(searchProductsByName)
const mockUpdateWithRelations = vi.mocked(updateProductWithAdminRelations)
const mockCountProducts = vi.mocked(countProducts)

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindCatalogCandidates.mockResolvedValue([])
    mockFindProductsByIds.mockResolvedValue([])
  })

  it("retorna productos y total correctamente", async () => {
    mockFindCatalogCandidates.mockResolvedValue([{ id: "prod-1", colorFamilyId: null }])
    mockFindProductsByIds.mockResolvedValue([rawProduct] as never)

    const result = await getProducts({})
    expect(result.total).toBe(1)
    expect(result.products).toHaveLength(1)
    expect(result.products[0].slug).toBe("nike-air-max")
  })

  it("colapsa los productos de una familia antes de paginar", async () => {
    mockFindCatalogCandidates.mockResolvedValue([
      { id: "prod-1", colorFamilyId: "family-1" },
      { id: "prod-2", colorFamilyId: "family-1" },
      { id: "prod-3", colorFamilyId: null },
    ])
    mockFindProductsByIds.mockResolvedValue([
      rawProduct,
      { ...rawProduct, id: "prod-3", slug: "adidas-forum" },
    ] as never)

    const result = await getProducts({})

    expect(result.total).toBe(2)
    expect(mockFindProductsByIds).toHaveBeenCalledWith(["prod-1", "prod-3"])
  })

  it("convierte basePrice a número", async () => {
    mockFindCatalogCandidates.mockResolvedValue([{ id: "prod-1", colorFamilyId: null }])
    mockFindProductsByIds.mockResolvedValue([rawProduct] as never)
    const { products } = await getProducts({})
    expect(products[0].basePrice).toBe(150000)
  })

  it("salePrice es null cuando no hay oferta", async () => {
    mockFindCatalogCandidates.mockResolvedValue([{ id: "prod-1", colorFamilyId: null }])
    mockFindProductsByIds.mockResolvedValue([rawProduct] as never)
    const { products } = await getProducts({})
    expect(products[0].salePrice).toBeNull()
    expect(products[0].isOnSale).toBe(false)
  })

  it("pagina las unidades visibles después de colapsar familias", async () => {
    mockFindCatalogCandidates.mockResolvedValue(
      Array.from({ length: 13 }, (_, index) => ({
        id: `prod-${index + 1}`,
        colorFamilyId: null,
      }))
    )
    await getProducts({ page: "2" }, 12)
    expect(mockFindProductsByIds).toHaveBeenCalledWith(["prod-13"])
  })

  it("la página mínima es 1 aunque se pase 0 o negativo", async () => {
    mockFindCatalogCandidates.mockResolvedValue([{ id: "prod-1", colorFamilyId: null }])
    await getProducts({ page: "0" }, 10)
    expect(mockFindProductsByIds).toHaveBeenCalledWith(["prod-1"])
  })
})

describe("getAdminProducts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("mantiene visibles todos los productos aunque pertenezcan a la misma familia de colores", async () => {
    mockFindManyProducts.mockResolvedValue([
      { ...rawProduct, id: "prod-1", colorFamilyId: "family-1" },
      { ...rawProduct, id: "prod-2", slug: "nike-air-max-blanco", colorFamilyId: "family-1" },
    ] as never)
    mockCountProducts.mockResolvedValue(2)

    const result = await getAdminProducts({ page: "1" }, 20)

    expect(result.total).toBe(2)
    expect(result.products.map((product) => product.id)).toEqual(["prod-1", "prod-2"])
    expect(mockFindManyProducts).toHaveBeenCalledWith(
      {},
      [{ createdAt: "desc" }, { id: "asc" }],
      20,
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

  it("incluye los productos hermanos de la familia de colores", async () => {
    mockFindBySlug.mockResolvedValue({
      ...rawProduct,
      colorFamily: {
        products: [
          rawProduct,
          {
            ...rawProduct,
            id: "prod-2",
            slug: "nike-air-max-blanco",
            name: "Nike Air Max Blanco",
            images: [{ id: "img-2", url: "/nike-white.jpg", alt: "Nike blanco", position: 0, color: "Blanco" }],
            variants: [{ ...rawProduct.variants[0], id: "var-2", sku: "NK-002", color: "Blanco" }],
          },
        ],
      },
    } as never)

    const result = await getProductBySlug("nike-air-max")

    expect(result!.colorSiblings).toEqual([
      expect.objectContaining({
        id: "prod-2",
        slug: "nike-air-max-blanco",
        variants: [expect.objectContaining({ color: "Blanco" })],
      }),
    ])
  })

  it("no publica hermanos de color deshabilitados para la tienda", async () => {
    mockFindBySlug.mockResolvedValue({
      ...rawProduct,
      colorFamily: {
        products: [
          rawProduct,
          {
            ...rawProduct,
            id: "prod-offline",
            slug: "nike-air-max-oculto",
            availableOnline: false,
          },
        ],
      },
    } as never)

    const result = await getProductBySlug("nike-air-max")

    expect(result!.colorSiblings).toEqual([])
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
    mockSearch.mockResolvedValue([{
      id: "prod-1",
      slug: "nike-air-max",
      name: "Nike Air Max",
      basePrice: makeDecimal(150000),
      brandId: "brand-1",
      brand: { name: "Nike" },
      colorFamilyId: null,
      images: [{ url: "/nike.jpg" }],
      variants: [{ color: "Negro" }],
    }] as never)
    const result = await searchProducts("nike")
    expect(result[0].name).toBe("Nike Air Max")
    expect(result[0].color).toBe("Negro")
  })

  it("pasa el excludeId al repositorio", async () => {
    mockSearch.mockResolvedValue([])
    await searchProducts("adidas", "prod-exclude")
    expect(mockSearch).toHaveBeenCalledWith("adidas", "prod-exclude")
  })
})

describe("updateProduct", () => {
  it("delega el guardado transaccional sin recrear las variantes ERP", async () => {
    mockUpdateWithRelations.mockResolvedValue(rawProduct as never)

    await updateProduct("prod-1", {
      name: "Nike Air Max",
      slug: "nike-air-max",
      brandId: null,
      gender: null,
      categoryId: "cat-1",
      basePrice: 150_000,
      isOnSale: false,
      availableOnline: true,
      availableInStores: true,
      variants: [
        {
          sku: "NK-001",
          size: "42",
          color: "Negro",
          stock: 10,
          inventory: [],
        },
      ],
      images: [],
    })

    expect(mockUpdateWithRelations).toHaveBeenCalledWith(
      "prod-1",
      expect.objectContaining({
        variants: [expect.objectContaining({ sku: "NK-001" })],
      })
    )
  })
})
