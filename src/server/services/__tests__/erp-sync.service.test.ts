import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/db/prisma", () => ({ prisma: {} }))
vi.mock("@/server/repositories/product-color.repository", () => ({
  findManyProductColors: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/server/repositories/erp-sync-log.repository", () => ({
  createErpSyncLog: vi.fn().mockResolvedValue(undefined),
  findRecentErpSyncLogs: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  countCatalogBrandsBySlug: vi.fn(),
  createCatalogBrand: vi.fn(),
  createCatalogProduct: vi.fn(),
  createCatalogVariant: vi.fn(),
  createDefaultImportCategory: vi.fn(),
  findCatalogBrandByErpId: vi.fn(),
  findCatalogBrandBySlug: vi.fn(),
  findCatalogProductBySlug: vi.fn(),
  findDefaultImportCategory: vi.fn(),
  updateCatalogBrandErpId: vi.fn(),
  updateCatalogProduct: vi.fn(),
  updateCatalogVariant: vi.fn(),
}))
vi.mock("@/server/repositories/erp-color-family.repository", () => ({
  applyErpColorFamilyKeyUpdates: vi.fn().mockResolvedValue({
    reconciliation: { plan: { actions: [], omissions: [], unchangedKeys: [] } },
  }),
}))

import { getERPAdapter } from "@/server/erp"
import { createErpSyncLog } from "@/server/repositories/erp-sync-log.repository"
import { findDefaultImportCategory } from "@/server/repositories/erp-catalog.repository"
import { applyErpColorFamilyKeyUpdates } from "@/server/repositories/erp-color-family.repository"
import { syncCatalogFromERP } from "../erp-sync.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockCreateErpSyncLog = vi.mocked(createErpSyncLog)
const mockFindDefaultImportCategory = vi.mocked(findDefaultImportCategory)
const mockApplyColorFamilyKeys = vi.mocked(applyErpColorFamilyKeyUpdates)

describe("syncCatalogFromERP", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.ERP_CATALOG_WRITES_ENABLED
  })

  it("bloquea escrituras cuando Loggro responde stock completo pero todo en cero", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              {
                erpId: "variant-1",
                sku: "MODEL-BLK_9",
                name: "TENIS MODELO NEGRO",
                basePrice: 100_000,
                stock: 0,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "all_zero",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 0,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL", { dryRun: false })

    expect(result).toMatchObject({
      success: false,
      processedCount: 0,
      productCount: 1,
      variantCount: 1,
    })
    expect(result.error).toContain("stock total en cero")
  })

  it("dry-run valida y cuenta el catálogo sin escribir ni siquiera el historial", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              {
                erpId: "variant-1",
                sku: "MODEL-BLK_9",
                name: "TENIS MODELO NEGRO",
                basePrice: 100_000,
                stock: 2,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL", { dryRun: true })

    expect(result).toMatchObject({
      success: true,
      dryRun: true,
      productCount: 1,
      variantCount: 1,
      definitionCount: 1,
    })
    expect(mockCreateErpSyncLog).not.toHaveBeenCalled()
  })

  it("rechaza una segunda sincronización mientras otra sigue en curso", async () => {
    let releaseFetch: ((value: unknown) => void) | undefined
    const fetchCatalog = vi.fn().mockImplementation(
      () => new Promise((resolve) => { releaseFetch = resolve })
    )
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog,
      ping: vi.fn(),
    } as never)

    const firstSync = syncCatalogFromERP("AUTO")
    await vi.waitFor(() => expect(fetchCatalog).toHaveBeenCalledTimes(1))

    const secondResult = await syncCatalogFromERP("MANUAL")

    expect(secondResult.success).toBe(false)
    expect(secondResult.error).toContain("ya hay una sincronización")
    expect(fetchCatalog).toHaveBeenCalledTimes(1)

    releaseFetch?.({
      groups: [],
      diagnostics: {
        sourceItemCount: 0,
        definitionCount: 0,
        variantCount: 0,
        groupCount: 0,
      },
      stock: {
        status: "partial",
        complete: false,
        requestedCount: 0,
        resolvedCount: 0,
        totalStock: 0,
        missingCodes: [],
        errors: [],
      },
    })
    await firstSync
  })

  it("reporta productos y variantes por separado en dry-run", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              { erpId: "v-1", sku: "MODEL-BLK_9", name: "MODELO", basePrice: 100_000, stock: 1 },
              { erpId: "v-2", sku: "MODEL-BLK_10", name: "MODELO", basePrice: 100_000, stock: 1 },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 3,
          definitionCount: 1,
          variantCount: 2,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 2,
          resolvedCount: 2,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("MANUAL", { dryRun: true })

    expect(result).toMatchObject({
      processedCount: 1,
      productCount: 1,
      variantCount: 2,
    })
  })

  it("mantiene pausadas las escrituras hasta habilitarlas explícitamente", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL-BLK",
            name: "TENIS MODELO NEGRO",
            basePrice: 100_000,
            variants: [
              { erpId: "v-1", sku: "MODEL-BLK_9", name: "MODELO", basePrice: 100_000, stock: 2 },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    const result = await syncCatalogFromERP("AUTO")

    expect(result.success).toBe(false)
    expect(result.error).toContain("escrituras del catálogo están pausadas")
    expect(mockFindDefaultImportCategory).not.toHaveBeenCalled()
  })

  it("reconcilia las claves opacas después de sincronizar productos y variantes", async () => {
    process.env.ERP_CATALOG_WRITES_ENABLED = "true"
    mockFindDefaultImportCategory.mockResolvedValue({ id: "category" } as never)
    const repository = await import("@/server/repositories/erp-catalog.repository")
    vi.mocked(repository.findCatalogProductBySlug).mockResolvedValue({
      id: "product-a",
      variants: [
        { id: "variant-a", sku: "180361GRN_8", size: "8", color: "Verde" },
      ],
    } as never)
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-a",
            sku: "180361GRN",
            name: "SKECHERS VERDE",
            basePrice: 100_000,
            colorFamilyKey: "loggro:004:180361",
            variants: [
              {
                erpId: "variant-erp-a",
                sku: "180361GRN_8",
                name: "SKECHERS VERDE",
                basePrice: 100_000,
                stock: 2,
              },
            ],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 1,
          variantCount: 1,
          groupCount: 1,
        },
        stock: {
          status: "complete",
          complete: true,
          requestedCount: 1,
          resolvedCount: 1,
          totalStock: 2,
          missingCodes: [],
          errors: [],
        },
      }),
      ping: vi.fn(),
    } as never)

    await syncCatalogFromERP("MANUAL")

    expect(mockApplyColorFamilyKeys).toHaveBeenCalledWith([
      { productId: "product-a", key: "loggro:004:180361" },
    ])
  })
})
