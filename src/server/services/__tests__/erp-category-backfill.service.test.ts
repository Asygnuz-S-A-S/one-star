import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  ensureCatalogCategory: vi.fn(),
  fillDefaultCatalogProductCategories: vi.fn(),
  findDefaultCatalogProductErpIds: vi.fn(),
  findDefaultImportCategory: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import {
  ensureCatalogCategory,
  fillDefaultCatalogProductCategories,
  findDefaultCatalogProductErpIds,
  findDefaultImportCategory,
} from "@/server/repositories/erp-catalog.repository"
import { syncDefaultProductCategoriesFromERP } from "../erp-category-backfill.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockEnsureCategory = vi.mocked(ensureCatalogCategory)
const mockFillCategories = vi.mocked(fillDefaultCatalogProductCategories)
const mockFindDefaultErpIds = vi.mocked(findDefaultCatalogProductErpIds)
const mockFindDefaultCategory = vi.mocked(findDefaultImportCategory)

describe("syncDefaultProductCategoriesFromERP", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindDefaultCategory.mockResolvedValue({ id: "default-category" } as never)
  })

  it("previsualiza solo productos aún ubicados en Sin Categoría", async () => {
    mockFindDefaultErpIds.mockResolvedValue(["erp-cap", "erp-sandals"])
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-cap",
            categorySuggestion: { slug: "accesorios", name: "Accesorios" },
            variants: [],
          },
          {
            erpId: "erp-sandals",
            categorySuggestion: {
              slug: "chanclas-y-sandalias",
              name: "Chanclas y Sandalias",
            },
            variants: [],
          },
          { erpId: "erp-shoe", variants: [] },
        ],
        diagnostics: {
          sourceItemCount: 3,
          definitionCount: 3,
          variantCount: 0,
          groupCount: 3,
        },
        stock: {
          status: "all_zero",
          complete: true,
          requestedCount: 0,
          resolvedCount: 0,
          totalStock: 0,
          missingCodes: [],
          errors: [],
        },
      }),
    } as never)

    const result = await syncDefaultProductCategoriesFromERP({ dryRun: true })

    expect(result).toEqual({
      dryRun: true,
      candidateCount: 2,
      counts: { accesorios: 1, "chanclas-y-sandalias": 1 },
      updatedCount: 0,
      fingerprint: expect.any(String),
    })
    expect(mockFillCategories).not.toHaveBeenCalled()
  })

  it("aplica exactamente la vista previa aprobada y conserva la condición de categoría", async () => {
    mockFindDefaultErpIds.mockResolvedValue(["erp-cap", "erp-sandals"])
    mockEnsureCategory.mockImplementation(async ({ slug, name }) => ({
      id: `${slug}-id`,
      slug,
      name,
    }) as never)
    mockFillCategories.mockResolvedValue(2)
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-cap",
            categorySuggestion: { slug: "accesorios", name: "Accesorios" },
            variants: [],
          },
          {
            erpId: "erp-sandals",
            categorySuggestion: {
              slug: "chanclas-y-sandalias",
              name: "Chanclas y Sandalias",
            },
            variants: [],
          },
        ],
        diagnostics: {
          sourceItemCount: 2,
          definitionCount: 2,
          variantCount: 0,
          groupCount: 2,
        },
        stock: {
          status: "all_zero",
          complete: true,
          requestedCount: 0,
          resolvedCount: 0,
          totalStock: 0,
          missingCodes: [],
          errors: [],
        },
      }),
    } as never)

    const preview = await syncDefaultProductCategoriesFromERP({ dryRun: true })
    const result = await syncDefaultProductCategoriesFromERP({
      dryRun: false,
      fingerprint: preview.fingerprint,
    })

    expect(mockFillCategories).toHaveBeenCalledWith(
      [
        { erpId: "erp-cap", categoryId: "accesorios-id" },
        { erpId: "erp-sandals", categoryId: "chanclas-y-sandalias-id" },
      ],
      "default-category"
    )
    expect(result).toEqual({ ...preview, dryRun: false, updatedCount: 2 })
  })
})
