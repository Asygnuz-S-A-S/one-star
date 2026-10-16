import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { brandDeleteMany, updateMany, transaction, inventoryDeleteMany, inventoryCreateMany } =
  vi.hoisted(() => ({
    brandDeleteMany: vi.fn(),
    updateMany: vi.fn(),
    inventoryDeleteMany: vi.fn(),
    inventoryCreateMany: vi.fn(),
    transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations)
    ),
  }))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    product: { updateMany },
    brand: { deleteMany: brandDeleteMany },
    inventoryLevel: { deleteMany: inventoryDeleteMany, createMany: inventoryCreateMany },
    $transaction: transaction,
  },
}))

import {
  fillDefaultCatalogProductCategories,
  fillMissingCatalogProductGenders,
  replaceErpInventoryLevels,
  unpublishCatalogProducts,
  replaceProvisionalCatalogProductBrands,
} from "../erp-catalog.repository"

describe("fillMissingCatalogProductGenders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
  })

  it("actualiza solo géneros vacíos y devuelve el total realmente modificado", async () => {
    const updated = await fillMissingCatalogProductGenders([
      { erpId: "erp-men", gender: "HOMBRE" },
      { erpId: "erp-women", gender: "MUJER" },
    ])

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { erpId: "erp-men", gender: null },
      data: { gender: "HOMBRE" },
    })
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { erpId: "erp-women", gender: null },
      data: { gender: "MUJER" },
    })
    expect(transaction).toHaveBeenCalledOnce()
    expect(updated).toBe(1)
  })
})

describe("fillDefaultCatalogProductCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
  })

  it("actualiza solo la categoría por defecto y devuelve las filas modificadas", async () => {
    const updated = await fillDefaultCatalogProductCategories(
      [
        { erpId: "erp-cap", categoryId: "accessories" },
        { erpId: "erp-sandals", categoryId: "sandals" },
      ],
      "default"
    )

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { erpId: "erp-cap", categoryId: "default" },
      data: { categoryId: "accessories" },
    })
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { erpId: "erp-sandals", categoryId: "default" },
      data: { categoryId: "sandals" },
    })
    expect(updated).toBe(1)
  })
})

describe("unpublishCatalogProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
  })

  it("oculta solo productos que aún están visibles y devuelve el total modificado", async () => {
    const updatedAt = new Date("2026-08-13T14:00:00.000Z")
    const updated = await unpublishCatalogProducts([
      { erpId: "erp-bag", updatedAt },
      { erpId: "erp-gift", updatedAt },
    ])

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { erpId: "erp-bag", isPublished: true, updatedAt },
      data: { isPublished: false },
    })
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { erpId: "erp-gift", isPublished: true, updatedAt },
      data: { isPublished: false },
    })
    expect(updated).toBe(1)
  })
})

describe("replaceProvisionalCatalogProductBrands", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
    brandDeleteMany.mockResolvedValue({ count: 1 })
  })

  it("reemplaza solo la marca provisional exacta y elimina únicamente las que quedan vacías", async () => {
    const result = await replaceProvisionalCatalogProductBrands([
      { erpId: "erp-a", sourceBrandErpId: "008", targetBrandId: "columbia" },
      { erpId: "erp-b", sourceBrandErpId: "001", targetBrandId: "converse" },
    ])

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        erpId: "erp-a",
        brand: { erpId: "008", name: "Por nombrar (008)" },
      },
      data: { brandId: "columbia" },
    })
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        erpId: "erp-b",
        brand: { erpId: "001", name: "Por nombrar (001)" },
      },
      data: { brandId: "converse" },
    })
    expect(brandDeleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { erpId: "008", name: "Por nombrar (008)", products: { none: {} } },
          { erpId: "001", name: "Por nombrar (001)", products: { none: {} } },
        ],
      },
    })
    expect(result).toEqual({ updatedCount: 1, deletedProvisionalBrandCount: 1 })
  })
})

describe("replaceErpInventoryLevels", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    inventoryDeleteMany.mockResolvedValue({ count: 2 })
    inventoryCreateMany.mockResolvedValue({ count: 3 })
  })

  it("borra solo las sedes vinculadas y recrea el desglose en una transacción", async () => {
    const rows = [
      { variantId: "v1", storeLocationId: "s1", stock: 2 },
      { variantId: "v1", storeLocationId: "s2", stock: 0 },
      { variantId: "v2", storeLocationId: "s1", stock: 1 },
    ]

    const created = await replaceErpInventoryLevels(["s1", "s2"], rows)

    expect(created).toBe(3)
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(inventoryDeleteMany).toHaveBeenCalledWith({
      where: { storeLocationId: { in: ["s1", "s2"] } },
    })
    expect(inventoryCreateMany).toHaveBeenCalledWith({ data: rows, skipDuplicates: true })
  })

  it("no escribe nada cuando no hay sedes vinculadas", async () => {
    const created = await replaceErpInventoryLevels([], [])

    expect(created).toBe(0)
    expect(transaction).not.toHaveBeenCalled()
  })
})
