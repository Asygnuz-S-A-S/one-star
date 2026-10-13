import { beforeEach, describe, expect, it, vi } from "vitest"
import * as XLSX from "xlsx"

vi.mock("server-only", () => ({}))

const txMock = {
  product: {
    create: vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: "new-product-id", ...args.data })),
    findUnique: vi.fn(async () => null),
  },
  productImage: {
    findMany: vi.fn(async () => [] as { url: string }[]),
    createMany: vi.fn(async () => ({ count: 0 })),
  },
  variant: {
    create: vi.fn(async () => ({ id: "new-variant-id" })),
    update: vi.fn(async () => ({ id: "updated" })),
  },
  category: {
    upsert: vi.fn(async (args: { create: { name: string } }) => ({ id: "new-category-id", ...args.create })),
  },
  brand: {
    upsert: vi.fn(async (args: { create: { name: string } }) => ({ id: "new-brand-id", ...args.create })),
  },
}

vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)) },
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

vi.mock("@/server/repositories/product.repository", () => ({
  findVariantsBySkus: vi.fn(async () => []),
}))

import { findVariantsBySkus } from "@/server/repositories/product.repository"
import { applyProductImport, previewProductImport } from "../product-import.service"

const COLUMNS = [
  "sku", "name", "brandName", "categoryName", "gender", "price", "isOnSale", "salePrice",
  "description", "extendedDescription", "size", "sizeUS", "sizeCM", "sizeEUR", "color", "stock",
  "image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8",
  "videoUrl", "photosFolderUrl", "readyFlag", "isPublished", "availableOnline", "availableInStores",
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
    vi.mocked(findVariantsBySkus).mockResolvedValue([])
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

  it("producto sin imágenes genera advertencia 'sin fotos'", async () => {
    const rows = [baseRow({ sku: "NO-PICS-1", image1: "", image2: "", image3: "" })]
    const preview = await previewProductImport(buildBuffer(rows))
    expect(preview.rows[0].warnings).toContain("sin fotos")
    expect(preview.rows[0].message).toContain("sin fotos")
  })

  it("SKU existente sin erpId -> update_variant", async () => {
    vi.mocked(findVariantsBySkus).mockResolvedValue([
      {
        id: "v1", sku: "NK-1", size: "39", color: "Negro", stock: 1,
        sizeUS: null, sizeCM: null, sizeEUR: null,
        product: { id: "p1", slug: "nike-pegasus-41", name: "Nike Pegasus 41", erpId: null },
      },
    ] as never)
    const preview = await previewProductImport(buildBuffer([baseRow({ sku: "NK-1" })]))
    expect(preview.rows[0].action).toBe("update_variant")
    expect(preview.summary.updatedVariants).toBe(1)
  })

  it("SKU gestionado por ERP se rechaza", async () => {
    vi.mocked(findVariantsBySkus).mockResolvedValue([
      {
        id: "v1", sku: "NK-1", size: "39", color: "Negro", stock: 1,
        sizeUS: null, sizeCM: null, sizeEUR: null,
        product: { id: "p1", slug: "erp-slug", name: "Nike Pegasus 41", erpId: "erp-123" },
      },
    ] as never)
    const preview = await previewProductImport(buildBuffer([baseRow({ sku: "NK-1" })]))
    expect(preview.rows[0].action).toBe("error")
    expect(preview.rows[0].message).toMatch(/gestionado por erp/i)
  })

  it("campos obligatorios vacíos generan error de fila", async () => {
    const preview = await previewProductImport(buildBuffer([baseRow({ sku: "" })]))
    expect(preview.rows[0].action).toBe("error")
  })
})

describe("applyProductImport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(findVariantsBySkus).mockResolvedValue([])
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

  it("falla sin escribir si el catálogo cambió desde la vista previa", async () => {
    const buffer = buildBuffer([baseRow()])
    await previewProductImport(buffer)
    await expect(applyProductImport(buffer, "fingerprint-viejo")).rejects.toThrow(/cambió/i)
    expect(txMock.product.create).not.toHaveBeenCalled()
  })
})
