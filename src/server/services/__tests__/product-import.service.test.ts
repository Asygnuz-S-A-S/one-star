import { beforeEach, describe, expect, it, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("server-only", () => ({}))

const txMock = {
  product: {
    create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "new-product-id", ...args.data })),
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => [] as { id: string; colorFamilyId: string | null }[]),
    update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({ id: args.where.id, ...args.data })),
    updateMany: vi.fn(async () => ({ count: 0 })),
  },
  productColorFamily: {
    create: vi.fn(async () => ({ id: "new-family-id" })),
  },
  productImage: {
    findMany: vi.fn(async () => [] as { url: string }[]),
    createMany: vi.fn(async () => ({ count: 0 })),
  },
  variant: {
    create: vi.fn(async (args?: { data: Record<string, unknown> }) => ({ id: "new-variant-id", ...(args?.data ?? {}) })),
    update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => ({ id: args.where.id, ...args.data })),
  },
  inventoryLevel: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "new-inv-id", ...args.data })),
  },
  category: {
    upsert: vi.fn(async (args: { create: { name: string } }) => ({ id: "new-category-id", ...args.create })),
  },
  brand: {
    upsert: vi.fn(async (args: { create: { name: string } }) => ({ id: "new-brand-id", ...args.create })),
  },
}

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
    storeSettings: {
      findUnique: vi.fn(async () => ({ catalogSource: "ARCHIVO" })),
    },
  },
}))

vi.mock("@/server/repositories/category.repository", () => ({
  findManyCategories: vi.fn(async () => [{ id: "cat-calzado", name: "Calzado" }]),
}))

vi.mock("@/server/repositories/brand.repository", () => ({
  findManyBrands: vi.fn(async () => [
    { id: "brand-nike", name: "Nike" },
    { id: "brand-on", name: "On" },
    { id: "brand-vans", name: "Accesorios Vans" },
  ]),
}))

const {
  mockIsErpCatalogOwner,
  mockFindVariantsBySkus,
  mockFindProductsByBaseSkus,
  mockFindProductsByIdsForImport,
} = vi.hoisted(() => ({
  mockIsErpCatalogOwner: vi.fn(async () => false),
  mockFindVariantsBySkus: vi.fn<(skus: string[]) => Promise<unknown[]>>(async () => []),
  mockFindProductsByBaseSkus: vi.fn<(bases: string[]) => Promise<unknown[]>>(async () => []),
  mockFindProductsByIdsForImport: vi.fn<(ids: string[]) => Promise<unknown[]>>(async () => []),
}))

vi.mock("@/server/services/catalog-source.service", () => ({
  isErpCatalogOwner: mockIsErpCatalogOwner,
}))

vi.mock("@/server/repositories/product.repository", () => ({
  findVariantsBySkus: mockFindVariantsBySkus,
  findProductsByBaseSkus: mockFindProductsByBaseSkus,
  findProductsByIdsForImport: mockFindProductsByIdsForImport,
}))

import * as fflate from "fflate"
import {
  applyProductImport,
  previewProductImport,
  validateImportFile,
  validateZipSafety,
  rowArrayToObject,
  MAX_FILE_SIZE_BYTES,
  MAX_CELL_LENGTH,
} from "../product-import.service"

const COLUMNS = [
  "sku", "name", "brandName", "categoryName", "gender", "price", "isOnSale", "salePrice",
  "description", "extendedDescription", "size", "sizeUS", "sizeCM", "sizeEUR", "color", "stock",
  "image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8",
  "videoUrl", "photosFolderUrl", "readyFlag", "colorGroup", "isPublished", "availableOnline", "availableInStores",
]

function baseRow(overrides: Record<string, unknown> = {}): (string | number | Date)[] {
  const row: Record<string, unknown> = {
    sku: "NK-1",
    name: "Nike Pegasus 41",
    brandName: "Nike",
    categoryName: "Calzado",
    gender: "HOMBRE",
    price: 480000,
    isOnSale: "NO",
    salePrice: "",
    description: "desc",
    extendedDescription: "",
    size: "40",
    sizeUS: "8",
    sizeCM: "25.5",
    sizeEUR: "40",
    color: "Negro",
    stock: 5,
    image1: "https://ejemplo.com/a.jpg",
    image2: "",
    image3: "",
    image4: "",
    image5: "",
    image6: "",
    image7: "",
    image8: "",
    videoUrl: "",
    photosFolderUrl: "",
    readyFlag: "OK",
    isPublished: "SI",
    availableOnline: "SI",
    availableInStores: "SI",
    ...overrides,
  }
  return COLUMNS.map((c) => (row[c] as string | number | Date) ?? "")
}

function buildBuffer(rows: (string | number | Date)[][], customHeaders = COLUMNS, includeNoteRow = true): ArrayBuffer {
  const aoa = includeNoteRow
    ? [customHeaders, customHeaders.map(() => "nota"), ...rows]
    : [customHeaders, ...rows]
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, "Productos")
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

describe("previewProductImport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsErpCatalogOwner.mockResolvedValue(false)
    mockFindVariantsBySkus.mockResolvedValue([])
    mockFindProductsByBaseSkus.mockResolvedValue([])
    mockFindProductsByIdsForImport.mockResolvedValue([])
  })

  it("producto nuevo con una variante -> create_product", async () => {
    const preview = await previewProductImport(buildBuffer([baseRow()]))
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0].action).toBe("create_product")
    expect(preview.summary).toEqual({ newProducts: 1, newVariants: 0, updatedVariants: 0, errors: 0 })
  })

  it("varias filas del mismo producto con SKU único se agrupan en variantes (compatibilidad hacia atrás)", async () => {
    const rows = [
      baseRow({ sku: "NK-1", size: "40" }),
      baseRow({ sku: "NK-2", size: "41" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows.map((r) => r.action)).toEqual(["create_product", "add_variant"])
    expect(preview.summary).toEqual({ newProducts: 1, newVariants: 1, updatedVariants: 0, errors: 0 })
  })

  it("formato fila por talla: mismo SKU base genera ${sku}_${size}", async () => {
    const rows = [
      baseRow({ sku: "VN0009QC6BT", size: "4.5" }),
      baseRow({ sku: "VN0009QC6BT", size: "5" }),
      baseRow({ sku: "VN0009QC6BT", size: "5.5" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows).toHaveLength(3)
    expect(preview.rows[0].sku).toBe("VN0009QC6BT_4.5")
    expect(preview.rows[1].sku).toBe("VN0009QC6BT_5")
    expect(preview.rows[2].sku).toBe("VN0009QC6BT_5.5")
    expect(preview.summary.newProducts).toBe(1)
    expect(preview.summary.newVariants).toBe(2)
  })

  it("SKU que ya contiene guion bajo no se modifica", async () => {
    const rows = [
      baseRow({ sku: "VN0009QC6BT_4.5", size: "4.5" }),
      baseRow({ sku: "VN0009QC6BT_5", size: "5" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].sku).toBe("VN0009QC6BT_4.5")
    expect(preview.rows[1].sku).toBe("VN0009QC6BT_5")
  })

  it("normaliza tallas numéricas ('7.0' y '7' son la misma talla)", async () => {
    const rows = [
      baseRow({ sku: "VN-1", size: "7.0" }),
      baseRow({ sku: "VN-1", size: "7" }),
    ]
    // Mismo SKU y misma talla normalizada (7) es un duplicado real
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[1].action).toBe("error")
    expect(preview.rows[1].message).toMatch(/duplicados en el archivo \(filas 3 y 4\)/i)
  })

  it("duplicado real: mismo SKU y misma talla indica ambas filas", async () => {
    const rows = [
      baseRow({ sku: "NK-1", size: "40" }),
      baseRow({ sku: "NK-1", size: "40" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[1].action).toBe("error")
    expect(preview.rows[1].message).toMatch(/filas 3 y 4/i)
  })

  it("recupera tallas guardadas como fecha de Excel (8 de mayo -> 8.5) y marca advertencia", async () => {
    const may8Date = new Date(Date.UTC(2026, 4, 8, 12, 0, 0))
    const rows = [baseRow({ sku: "DATE-SKU", size: may8Date })]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].action).toBe("create_product")
    expect(preview.rows[0].message).toContain("talla recuperada de fecha")
    expect(preview.rows[0].warnings).toContain("talla recuperada de fecha")
  })

  it("rechaza fechas que no corresponden a medias tallas válidas", async () => {
    const octDate = new Date(Date.UTC(2026, 9, 20, 12, 0, 0))
    const rows = [baseRow({ sku: "BAD-DATE", size: octDate })]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].action).toBe("error")
    expect(preview.rows[0].message).toBe("Talla inválida")
  })

  it("alias de marca: 'ONCLOUD' se resuelve como 'On' y 'ACESSORIOS VANS' como 'Accesorios Vans'", async () => {
    const rows = [
      baseRow({ sku: "ON-1", brandName: "ONCLOUD" }),
      baseRow({ sku: "VANS-1", brandName: "ACESSORIOS VANS" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].action).toBe("create_product")
    expect(preview.rows[1].action).toBe("create_product")
  })

  it("omite sin error filas cuya marca sea BOLSAS DE VENTA, BONO o FALTA ORGANIZAR ESTA REFERENCIA", async () => {
    const rows = [
      baseRow({ sku: "BAG-1", brandName: "BOLSAS DE VENTA" }),
      baseRow({ sku: "BONO-1", brandName: "BONO" }),
      baseRow({ sku: "PEND-1", brandName: "FALTA ORGANIZAR ESTA REFERENCIA" }),
      baseRow({ sku: "REAL-1", brandName: "Nike" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].action).toBe("skip")
    expect(preview.rows[1].action).toBe("skip")
    expect(preview.rows[2].action).toBe("skip")
    expect(preview.rows[3].action).toBe("create_product")
    expect(preview.summary.skipped).toBe(3)
    expect(preview.summary.newProducts).toBe(1)
  })

  it("lectura por nombre de columna con alias en español y fila 2 como producto real sin notas", async () => {
    const spanishHeaders = [
      "SKU", "NOMBRE DEL PRODUCTO", "MARCA", "CATEGORIA", "GENERO", "PRECIO",
      "EN OFERTA?", "PRECIO EN OFERTA", "DESCRIPCIÓN CORTA", "DESCRIPCIÓN LARGA",
      "TALLA", "COLOR", "STOCK", "URL FOTOS", "PRODUCTO LISTO",
    ]
    const row = [
      "SP-1", "Zapato Español", "Nike", "Calzado", "HOMBRE", 250000,
      "NO", "", "Desc corta", "Desc larga", "39", "Rojo", 8, "https://drive.google.com/test", "OK",
    ]
    // Sin fila de notas (fila 2 es el producto real)
    const buf = buildBuffer([row as never], spanishHeaders, false)
    const preview = await previewProductImport(buf)
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0].sku).toBe("SP-1")
    expect(preview.rows[0].productName).toBe("Zapato Español")
    expect(preview.rows[0].action).toBe("create_product")
  })

  it("PRODUCTO LISTO: omite filas no marcadas OK cuando onlyReadyRows está activo", async () => {
    const rows = [
      baseRow({ sku: "READY-1", readyFlag: "OK" }),
      baseRow({ sku: "NOT-READY-1", readyFlag: "NO" }),
      baseRow({ sku: "NOT-READY-2", readyFlag: "" }),
    ]
    const preview = await previewProductImport(buildBuffer(rows, COLUMNS, true))
    expect(preview.rows[0].action).toBe("create_product")
    expect(preview.rows[1].action).toBe("skip")
    expect(preview.rows[1].message).toContain("no lista")
    expect(preview.rows[2].action).toBe("skip")
    expect(preview.summary.skipped).toBe(2)
    expect(preview.summary.newProducts).toBe(1)
  })

  it("PRODUCTO LISTO: desactiva productos existentes cuando no están marcados OK", async () => {
    const existingNotReadyProd = {
      id: "prod-not-ready",
      slug: "nr123",
      name: "Zapato No Listo",
      erpId: null,
      basePrice: 300000,
      salePrice: null,
      isOnSale: false,
      description: null,
      extendedDescription: null,
      gender: null,
      isPublished: true,
      availableOnline: true,
      availableInStores: true,
      categoryId: "cat-calzado",
      category: { id: "cat-calzado", name: "Calzado" },
      brandId: "brand-nike",
      brand: { id: "brand-nike", name: "Nike" },
      images: [],
      variants: [{ id: "v-nr", sku: "NR123_40", size: "40", stock: 5 }],
    }
    mockFindProductsByBaseSkus.mockImplementation(async (bases: string[]) => {
      if (bases.includes("NR123")) return [existingNotReadyProd]
      return []
    })
    mockFindProductsByIdsForImport.mockImplementation(async (ids: string[]) => {
      if (ids.includes("prod-not-ready")) return [existingNotReadyProd]
      return []
    })

    const rows = [
      baseRow({ sku: "READY-1", readyFlag: "OK" }),
      baseRow({ sku: "NR123", readyFlag: "" }),
    ]
    const buffer = buildBuffer(rows, COLUMNS, true)
    const preview = await previewProductImport(buffer, { onlyReadyRows: true })
    expect(preview.summary.newProducts).toBe(1)
    expect(preview.summary.deactivatedProducts).toBe(1)
    expect(preview.products.find((p) => p.productId === "prod-not-ready")?.isDeactivated).toBe(true)

    const applyRes = await applyProductImport(buffer, preview.fingerprint, { onlyReadyRows: true })
    expect(applyRes.deactivatedProducts).toBe(1)
    expect(txMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["prod-not-ready"] } },
      data: { isPublished: false },
    })
  })

  it("GRUPO COLOR: vincula productos con el mismo grupo de color a una ProductColorFamily", async () => {
    let callCount = 0
    txMock.product.create.mockImplementation(async (args) => {
      callCount++
      return { id: `prod-color-${callCount}`, ...args.data }
    })
    txMock.productColorFamily.create.mockResolvedValue({ id: "family-vans-lowpro" })

    const rows = [
      baseRow({ sku: "VN000D83BLA", name: "Vans Super Lowpro Negro", colorGroup: "VANS SUPER LOWPRO", readyFlag: "OK" }),
      baseRow({ sku: "VN000D83CCZ", name: "Vans Super Lowpro Beige", colorGroup: "VANS SUPER LOWPRO", readyFlag: "OK" }),
    ]
    const buffer = buildBuffer(rows, COLUMNS, true)
    const preview = await previewProductImport(buffer, { onlyReadyRows: true })
    expect(preview.summary.newProducts).toBe(2)

    await applyProductImport(buffer, preview.fingerprint, { onlyReadyRows: true })
    expect(txMock.productColorFamily.create).toHaveBeenCalled()
    expect(txMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining(["prod-color-1", "prod-color-2"]) } },
      data: { colorFamilyId: "family-vans-lowpro" },
    })
  })

  it("producto sin imágenes genera advertencia 'sin fotos'", async () => {
    const rows = [baseRow({ sku: "NO-PICS-1", image1: "", image2: "", image3: "" })]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].warnings).toContain("sin fotos")
    expect(preview.rows[0].message).toContain("sin fotos")
  })

  it("SKU existente sin erpId -> update_variant", async () => {
    const existingProd = {
      id: "p1",
      slug: "nike-pegasus-41",
      name: "Nike Pegasus 41",
      erpId: null,
      basePrice: 480000,
      salePrice: null,
      isOnSale: false,
      description: null,
      extendedDescription: null,
      gender: null,
      isPublished: true,
      availableOnline: true,
      availableInStores: true,
      categoryId: "cat-calzado",
      category: { id: "cat-calzado", name: "Calzado" },
      brandId: "brand-nike",
      brand: { id: "brand-nike", name: "Nike" },
      images: [],
      variants: [
        {
          id: "v1",
          sku: "NK-1",
          size: "39",
          color: "Negro",
          stock: 1,
          erpId: null,
        },
      ],
    }
    mockFindVariantsBySkus.mockResolvedValue([
      {
        id: "v1",
        sku: "NK-1",
        size: "39",
        color: "Negro",
        stock: 1,
        sizeUS: null,
        sizeCM: null,
        sizeEUR: null,
        product: existingProd,
      },
    ] as never)
    mockFindProductsByIdsForImport.mockResolvedValue([existingProd] as never)
    mockFindProductsByBaseSkus.mockResolvedValue([existingProd] as never)

    const preview = await previewProductImport(buildBuffer([baseRow({ sku: "NK-1" })]))
    expect(preview.rows[0].action).toBe("update_variant")
    expect(preview.summary.updatedVariants).toBe(1)
  })

  it("con fuente ERP: SKU gestionado por ERP se rechaza", async () => {
    mockIsErpCatalogOwner.mockResolvedValue(true)
    const erpProduct = {
      id: "p1",
      slug: "erp-slug",
      name: "Nike Pegasus 41",
      erpId: "erp-123",
      basePrice: 400000,
      salePrice: null,
      isOnSale: false,
      description: null,
      extendedDescription: null,
      gender: null,
      isPublished: true,
      availableOnline: true,
      availableInStores: true,
      categoryId: "cat-calzado",
      category: { id: "cat-calzado", name: "Calzado" },
      brandId: "brand-nike",
      brand: { id: "brand-nike", name: "Nike" },
      images: [],
      variants: [
        {
          id: "v1",
          sku: "NK-1",
          size: "39",
          color: "Negro",
          stock: 1,
          erpId: "loggro-v1",
        },
      ],
    }
    mockFindVariantsBySkus.mockResolvedValue([
      {
        id: "v1",
        sku: "NK-1",
        size: "39",
        color: "Negro",
        stock: 1,
        sizeUS: null,
        sizeCM: null,
        sizeEUR: null,
        product: erpProduct,
      },
    ] as never)
    mockFindProductsByIdsForImport.mockResolvedValue([erpProduct] as never)
    mockFindProductsByBaseSkus.mockResolvedValue([erpProduct] as never)

    const preview = await previewProductImport(buildBuffer([baseRow({ sku: "NK-1" })]))
    expect(preview.rows[0].action).toBe("error")
    expect(preview.rows[0].message).toMatch(/gestionado por erp/i)
  })

  it("con fuente ARCHIVO: producto existente con erpId recibe precio y stock del archivo", async () => {
    mockIsErpCatalogOwner.mockResolvedValue(false)
    const existingProduct = {
      id: "prod-erp-1",
      slug: "nk-1",
      name: "Nike Pegasus 41 Legacy",
      erpId: "loggro-prod-999",
      basePrice: 200000,
      salePrice: null,
      isOnSale: false,
      description: "Descripción previa",
      extendedDescription: null,
      gender: "HOMBRE",
      isPublished: true,
      availableOnline: true,
      availableInStores: true,
      categoryId: "cat-calzado",
      category: { id: "cat-calzado", name: "Calzado" },
      brandId: "brand-nike",
      brand: { id: "brand-nike", name: "Nike" },
      images: [{ id: "img-1", url: "https://res.cloudinary.com/demo/image/upload/v1/foto1.jpg", order: 0 }],
      variants: [
        {
          id: "v-erp-1",
          sku: "NK-1",
          size: "40",
          color: "Negro",
          stock: 0,
          erpId: "loggro-var-999",
        },
      ],
    }

    mockFindVariantsBySkus.mockResolvedValue([
      {
        id: "v-erp-1",
        sku: "NK-1",
        size: "40",
        color: "Negro",
        stock: 0,
        sizeUS: null,
        sizeCM: null,
        sizeEUR: null,
        product: existingProduct,
      },
    ] as never)
    mockFindProductsByBaseSkus.mockResolvedValue([existingProduct] as never)

    const buffer = buildBuffer([baseRow({ sku: "NK-1", size: "40", price: 499000, stock: 12 })])
    const preview = await previewProductImport(buffer)

    expect(preview.rows[0].action).toBe("update_variant")
    expect(preview.summary.updatedVariants).toBe(1)
    expect(preview.summary.newProducts).toBe(0)
    expect(preview.products[0]).toMatchObject({
      productId: "prod-erp-1",
      isExisting: true,
      priceBefore: 200000,
      priceAfter: 499000,
      stockBefore: 0,
      stockAfter: 12,
    })

    const result = await applyProductImport(buffer, preview.fingerprint)
    expect(result.updatedVariants).toBe(1)
    expect(result.newProducts).toBe(0)

    expect(txMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-erp-1" },
        data: expect.objectContaining({
          basePrice: 499000,
        }),
      })
    )

    expect(txMock.variant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "v-erp-1" },
        data: expect.objectContaining({
          stock: 12,
        }),
      })
    )

    expect(txMock.inventoryLevel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          variantId: "v-erp-1",
          storeLocationId: null,
          stock: 12,
        }),
      })
    )
  })

  it("sin duplicados: agrega tallas faltantes a producto existente por SKU base sin crear nuevo producto", async () => {
    mockIsErpCatalogOwner.mockResolvedValue(false)
    const existingProduct = {
      id: "prod-132173c",
      slug: "132173c",
      name: "Converse Chuck Taylor 132173C",
      erpId: "loggro-132173c",
      basePrice: 320000,
      salePrice: null,
      isOnSale: false,
      description: "Chuck Taylor clásico",
      extendedDescription: null,
      gender: "UNISEX",
      isPublished: true,
      availableOnline: true,
      availableInStores: true,
      categoryId: "cat-calzado",
      category: { id: "cat-calzado", name: "Calzado" },
      brandId: "brand-nike",
      brand: { id: "brand-nike", name: "Converse" },
      images: [{ id: "img-1", url: "https://res.cloudinary.com/demo/image/upload/v1/converse.jpg", order: 0 }],
      variants: [
        {
          id: "var-t38",
          sku: "132173C_38",
          size: "38",
          color: "Negro",
          stock: 4,
          erpId: "loggro-var-38",
        },
      ],
    }

    mockFindProductsByBaseSkus.mockResolvedValue([existingProduct] as never)
    mockFindVariantsBySkus.mockResolvedValue([])

    const buffer = buildBuffer([
      baseRow({
        sku: "132173C_39",
        name: "Converse Chuck Taylor 132173C",
        size: "39",
        price: 320000,
        stock: 8,
      }),
    ])

    const preview = await previewProductImport(buffer)

    expect(preview.rows[0].action).toBe("add_variant")
    expect(preview.summary.newProducts).toBe(0)
    expect(preview.summary.newVariants).toBe(1)
    expect(preview.products[0]).toMatchObject({
      productId: "prod-132173c",
      isExisting: true,
      addedSizesCount: 1,
    })

    const applyResult = await applyProductImport(buffer, preview.fingerprint)
    expect(applyResult.newProducts).toBe(0)
    expect(applyResult.newVariants).toBe(1)

    expect(txMock.product.create).not.toHaveBeenCalled()
    expect(txMock.variant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "prod-132173c",
          size: "39",
          stock: 8,
        }),
      })
    )
  })

  it("conserva imágenes y descripciones existentes intactas al importar con fill_empty", async () => {
    mockIsErpCatalogOwner.mockResolvedValue(false)
    const existingProduct = {
      id: "prod-curated-1",
      slug: "cur-1",
      name: "Zapato Curado Manual",
      erpId: "loggro-curated",
      basePrice: 250000,
      salePrice: null,
      isOnSale: false,
      description: "Descripción redactada a mano el 19 oct",
      extendedDescription: "Descripción extendida manual",
      gender: "UNISEX",
      isPublished: true,
      availableOnline: true,
      availableInStores: true,
      categoryId: "cat-calzado",
      category: { id: "cat-calzado", name: "Calzado" },
      brandId: "brand-nike",
      brand: { id: "brand-nike", name: "Nike" },
      images: [
        { id: "img-c1", url: "https://res.cloudinary.com/onestar/image/upload/manual1.jpg", order: 0 },
      ],
      variants: [
        {
          id: "var-c1",
          sku: "CUR-1",
          size: "40",
          color: "Negro",
          stock: 2,
          erpId: "var-loggro-1",
        },
      ],
    }

    mockFindProductsByBaseSkus.mockResolvedValue([existingProduct] as never)
    mockFindVariantsBySkus.mockResolvedValue([
      {
        id: "var-c1",
        sku: "CUR-1",
        size: "40",
        color: "Negro",
        stock: 2,
        sizeUS: null,
        sizeCM: null,
        sizeEUR: null,
        product: existingProduct,
      },
    ] as never)
    txMock.productImage.findMany.mockResolvedValue([
      { url: "https://res.cloudinary.com/onestar/image/upload/manual1.jpg" },
    ])

    const buffer = buildBuffer([
      baseRow({
        sku: "CUR-1",
        name: "Nombre Nuevo en Excel",
        description: "Nueva descripción en Excel",
        price: 290000,
        stock: 10,
        image1: "https://res.cloudinary.com/onestar/image/upload/manual1.jpg",
      }),
    ])

    const preview = await previewProductImport(buffer, { textUpdateMode: "fill_empty" })
    await applyProductImport(buffer, preview.fingerprint, { textUpdateMode: "fill_empty" })

    expect(txMock.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-curated-1" },
        data: expect.not.objectContaining({
          description: "Nueva descripción en Excel",
          name: "Nombre Nuevo en Excel",
        }),
      })
    )

    expect(txMock.productImage.createMany).not.toHaveBeenCalled()
  })

  it("campos obligatorios vacíos generan error de fila", async () => {
    const preview = await previewProductImport(buildBuffer([baseRow({ sku: "" })]))
    expect(preview.rows[0].action).toBe("error")
  })
})

describe("applyProductImport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsErpCatalogOwner.mockResolvedValue(false)
    mockFindVariantsBySkus.mockResolvedValue([])
    mockFindProductsByBaseSkus.mockResolvedValue([])
    mockFindProductsByIdsForImport.mockResolvedValue([])
  })

  it("crea el producto y su variante cuando el fingerprint coincide", async () => {
    const buffer = buildBuffer([baseRow()])
    const preview = await previewProductImport(buffer)
    const result = await applyProductImport(buffer, preview.fingerprint)
    expect(result).toEqual({ newProducts: 1, newVariants: 1, updatedVariants: 0 })
    expect(txMock.product.create).toHaveBeenCalledTimes(1)
    expect(txMock.variant.create).toHaveBeenCalledTimes(1)
  })

  it("guarda hasta 8 imágenes por producto", async () => {
    const buffer = buildBuffer([
      baseRow({
        image1: "https://ejemplo.com/1.jpg",
        image2: "https://ejemplo.com/2.jpg",
        image3: "https://ejemplo.com/3.jpg",
        image4: "https://ejemplo.com/4.jpg",
        image5: "https://ejemplo.com/5.jpg",
        image6: "https://ejemplo.com/6.jpg",
        image7: "https://ejemplo.com/7.jpg",
        image8: "https://ejemplo.com/8.jpg",
      }),
    ])
    const preview = await previewProductImport(buffer)
    await applyProductImport(buffer, preview.fingerprint)
    expect(txMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          images: {
            create: expect.arrayContaining([
              expect.objectContaining({ url: "https://ejemplo.com/1.jpg" }),
              expect.objectContaining({ url: "https://ejemplo.com/8.jpg" }),
            ]),
          },
        }),
      })
    )
  })

  it("guarda photosFolderUrl y desactiva publicación si el producto no tiene fotos", async () => {
    const buffer = buildBuffer([
      baseRow({
        image1: "", image2: "", image3: "",
        photosFolderUrl: "https://drive.google.com/drive/folders/carpeta-fotos",
        isPublished: "SI",
      }),
    ])
    const preview = await previewProductImport(buffer)
    await applyProductImport(buffer, preview.fingerprint)
    expect(txMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          photosFolderUrl: "https://drive.google.com/drive/folders/carpeta-fotos",
          isPublished: false,
        }),
      })
    )
  })

  it("resuelve alias de marca al crear en base de datos ('ONCLOUD' -> 'On')", async () => {
    const buffer = buildBuffer([baseRow({ brandName: "ONCLOUD" })])
    const preview = await previewProductImport(buffer)
    await applyProductImport(buffer, preview.fingerprint)
    expect(txMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          brand: { connect: { id: "brand-on" } },
        }),
      })
    )
  })

  it("guarda isFeatured, isLaunch, highlights y faqs al crear producto", async () => {
    const customHeaders = [...COLUMNS, "DESTACADO", "LANZAMIENTO", "BENEFICIOS", "FAQS"]
    const row = [
      ...baseRow(),
      "SI",
      "SI",
      "Amortiguación reactiva; Material transpirable",
      "¿Es original? | Sí, 100% original garantizado",
    ]
    const buffer = buildBuffer([row], customHeaders, false)
    const preview = await previewProductImport(buffer)
    expect(preview.rows[0].action).toBe("create_product")

    await applyProductImport(buffer, preview.fingerprint)
    expect(txMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isFeatured: true,
          isLaunch: true,
          highlights: ["Amortiguación reactiva", "Material transpirable"],
          faqs: [{ q: "¿Es original?", a: "Sí, 100% original garantizado" }],
        }),
      })
    )
  })

  it("advierte si el título SEO excede 60 caracteres o la descripción 160 caracteres sin bloquear", async () => {
    const customHeaders = [...COLUMNS, "TITULO SEO", "DESCRIPCION SEO"]
    const row = [
      ...baseRow(),
      "Este es un título SEO excesivamente largo que sobrepasa el límite sugerido de sesenta caracteres",
      "Esta es una meta descripción excesivamente larga diseñada específicamente para sobrepasar los ciento sesenta caracteres recomendados para motores de búsqueda como Google y Bing.",
    ]
    const buffer = buildBuffer([row], customHeaders, false)
    const preview = await previewProductImport(buffer)

    expect(preview.rows[0].action).toBe("create_product")
    expect(preview.rows[0].warnings).toEqual(
      expect.arrayContaining([
        "Título SEO excede los 60 caracteres recomendados",
        "Descripción SEO excede los 160 caracteres recomendados",
      ])
    )

    await applyProductImport(buffer, preview.fingerprint)
    expect(txMock.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metaTitle: row[row.length - 2],
          metaDescription: row[row.length - 1],
        }),
      })
    )
  })

  it("falla sin escribir si el catálogo cambió desde la vista previa", async () => {
    const buffer = buildBuffer([baseRow()])
    await previewProductImport(buffer)
    await expect(applyProductImport(buffer, "fingerprint-viejo")).rejects.toThrow(/cambió/i)
    expect(txMock.product.create).not.toHaveBeenCalled()
  })
})

function createCraftedZipBomb(declaredEntrySize: number): ArrayBuffer {
  const zipBytes = fflate.zipSync({
    "sheet1.xml": fflate.strToU8("<xml></xml>"),
  })
  const buf = Buffer.from(zipBytes)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

  for (let i = 0; i < buf.length - 4; i++) {
    // Local File Header
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      view.setUint32(i + 22, declaredEntrySize, true)
    }
    // Central Directory File Header
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      view.setUint32(i + 24, declaredEntrySize, true)
    }
  }

  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

function createCraftedMultiEntryZip(declaredPerEntrySize: number): ArrayBuffer {
  const zipBytes = fflate.zipSync({
    "entry1.xml": fflate.strToU8("<xml></xml>"),
    "entry2.xml": fflate.strToU8("<xml></xml>"),
    "entry3.xml": fflate.strToU8("<xml></xml>"),
  })
  const buf = Buffer.from(zipBytes)
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)

  for (let i = 0; i < buf.length - 4; i++) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      view.setUint32(i + 22, declaredPerEntrySize, true)
    }
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      view.setUint32(i + 24, declaredPerEntrySize, true)
    }
  }

  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

describe("validateImportFile (pre-read limits)", () => {
  it("rechaza archivos con extensiones no permitidas (.xlsm, .xls, .csv, .txt)", () => {
    expect(() =>
      validateImportFile({ name: "productos.xlsm", size: 1024 })
    ).toThrow(/solo se admiten archivos con extensión \.xlsx/i)

    expect(() =>
      validateImportFile({ name: "productos.xls", size: 1024 })
    ).toThrow(/solo se admiten archivos con extensión \.xlsx/i)

    expect(() =>
      validateImportFile({ name: "productos.csv", size: 1024 })
    ).toThrow(/solo se admiten archivos con extensión \.xlsx/i)

    expect(() =>
      validateImportFile({ name: "malware.exe", size: 1024 })
    ).toThrow(/solo se admiten archivos con extensión \.xlsx/i)
  })

  it("rechaza archivos vacíos (0 bytes)", () => {
    expect(() =>
      validateImportFile({ name: "productos.xlsx", size: 0 })
    ).toThrow(/el archivo está vacío/i)
  })

  it("rechaza archivos que exceden el tamaño máximo permitido (> 2 MB)", () => {
    expect(() =>
      validateImportFile({ name: "productos.xlsx", size: MAX_FILE_SIZE_BYTES + 1 })
    ).toThrow(/excede el tamaño máximo permitido de 2 MB/i)
  })

  it("rechaza tipos MIME incompatibles", () => {
    expect(() =>
      validateImportFile({
        name: "productos.xlsx",
        size: 1024,
        type: "application/pdf",
      })
    ).toThrow(/tipo de contenido del archivo no es compatible/i)

    expect(() =>
      validateImportFile({
        name: "productos.xlsx",
        size: 1024,
        type: "image/png",
      })
    ).toThrow(/tipo de contenido del archivo no es compatible/i)
  })

  it("admite archivos .xlsx con tamaño y MIME válidos", () => {
    expect(() =>
      validateImportFile({
        name: "productos.xlsx",
        size: 1024,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    ).not.toThrow()

    expect(() =>
      validateImportFile({
        name: "productos.xlsx",
        size: 1024,
        type: "application/octet-stream",
      })
    ).not.toThrow()
  })
})

describe("validateZipSafety (protección contra zip bomb)", () => {
  it("rechaza buffers que no son archivos ZIP válidos", () => {
    const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer
    expect(() => validateZipSafety(invalidBuffer)).toThrow(/no es un archivo ZIP \/ XLSX válido/i)
  })

  it("rechaza un ZIP que declara un tamaño descomprimido enorme en una sola entrada (> 20 MB)", () => {
    const zipBomb = createCraftedZipBomb(25 * 1024 * 1024)
    expect(() => validateZipSafety(zipBomb)).toThrow(/excede el límite de seguridad \(máx 20 MB\)/i)
  })

  it("rechaza un ZIP cuyo total acumulado excede el límite permitido (> 50 MB)", () => {
    // 3 entradas de 18 MB = 54 MB total
    const multiEntryBomb = createCraftedMultiEntryZip(18 * 1024 * 1024)
    expect(() => validateZipSafety(multiEntryBomb)).toThrow(/tamaño total descomprimido.*excede el límite de seguridad.*50 MB/i)
  })
})

describe("Límites de contenido y parseo seguro", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsErpCatalogOwner.mockResolvedValue(false)
    mockFindVariantsBySkus.mockResolvedValue([])
    mockFindProductsByBaseSkus.mockResolvedValue([])
    mockFindProductsByIdsForImport.mockResolvedValue([])
  })

  it("rechaza un buffer que excede MAX_FILE_SIZE_BYTES en previewProductImport", async () => {
    const largeBuffer = new ArrayBuffer(MAX_FILE_SIZE_BYTES + 1)
    await expect(previewProductImport(largeBuffer)).rejects.toThrow(/excede el tamaño máximo permitido de 2 MB/i)
  })

  it("rechaza si excede el límite de columnas (> 40 columnas)", async () => {
    const tooManyColumns = Array.from({ length: 41 }, (_, i) => `col_${i}`)
    const aoa = [tooManyColumns, tooManyColumns.map(() => "nota"), tooManyColumns.map(() => "val")]
    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, "Productos")
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer
    const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer

    await expect(previewProductImport(buffer)).rejects.toThrow(/excede el límite máximo de 40 columnas/i)
  })

  it("rechaza si una celda excede MAX_CELL_LENGTH (> 5.000 caracteres)", async () => {
    const giantCell = "A".repeat(MAX_CELL_LENGTH + 1)
    const row = baseRow({ description: giantCell })
    const buffer = buildBuffer([row])

    await expect(previewProductImport(buffer)).rejects.toThrow(/excede el límite máximo de 5\.000 caracteres/i)
  })

  it("rechaza si hay más de 5.000 filas de datos sin truncar en silencio", async () => {
    const rows: string[][] = []
    for (let i = 0; i < 5001; i++) {
      rows.push([`NK-${i}`])
    }
    const aoa = [["sku"], ["nota"], ...rows]
    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, "Productos")
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer
    const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer

    await expect(previewProductImport(buffer)).rejects.toThrow(/excede el límite máximo de 5\.000 filas de datos/i)
  })

  it("ignora encabezados peligrosos (__proto__, constructor, prototype) previniendo contaminación de prototipo", () => {
    const evilRow = ["evil-sku", "evil-value", "another-evil"]
    const evilHeaders = ["sku", "__proto__", "constructor"]

    const obj = rowArrayToObject(evilRow, evilHeaders)

    expect(obj.sku).toBe("evil-sku")
    expect(obj["__proto__"]).toBeUndefined()
    expect(obj["constructor"]).toBeUndefined()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect((Object.prototype as unknown as Record<string, unknown>).polluted).toBeUndefined()
    expect((Object.prototype as unknown as Record<string, unknown>)["__proto__"]).not.toBe("evil-value")
  })

  it("un archivo de Excel con columna __proto__ no contamina el prototipo global al previsualizar", async () => {
    const customColumns = [...COLUMNS, "__proto__"]
    const rowData = [...baseRow({ sku: "PROTO-1" }), "malicious_payload"]
    const aoa = [customColumns, customColumns.map(() => "nota"), rowData]
    const sheet = XLSX.utils.aoa_to_sheet(aoa)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, "Productos")
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer
    const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer

    const preview = await previewProductImport(buffer)
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0].sku).toBe("PROTO-1")
    expect(({} as Record<string, unknown>)["malicious_payload"]).toBeUndefined()
    expect((Object.prototype as unknown as Record<string, unknown>)["malicious_payload"]).toBeUndefined()
  })

  it("procesa exitosamente un archivo válido de 12 filas con resumen preciso", async () => {
    // 6 productos, cada uno con 2 variantes (tallas 40 y 41) = 12 filas
    const rows: (string | number | Date)[][] = []
    for (let p = 1; p <= 6; p++) {
      const prodName = `Nike Modelo ${p}`
      rows.push(baseRow({ sku: `NKP${p}_40`, name: prodName, size: "40" }))
      rows.push(baseRow({ sku: `NKP${p}_41`, name: prodName, size: "41" }))
    }
    expect(rows).toHaveLength(12)

    const buffer = buildBuffer(rows)
    const preview = await previewProductImport(buffer)

    expect(preview.rows).toHaveLength(12)
    expect(preview.summary).toEqual({
      newProducts: 6,
      newVariants: 6,
      updatedVariants: 0,
      errors: 0,
    })
    expect(preview.fingerprint).toBeTruthy()

    const applyResult = await applyProductImport(buffer, preview.fingerprint)
    expect(applyResult).toEqual({
      newProducts: 6,
      newVariants: 12,
      updatedVariants: 0,
    })
    expect(txMock.product.create).toHaveBeenCalledTimes(6)
    expect(txMock.variant.create).toHaveBeenCalledTimes(12)
  })
})
