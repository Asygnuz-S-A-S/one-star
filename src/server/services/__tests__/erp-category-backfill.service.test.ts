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
  fillDefaultCatalogProductCategories,
  findDefaultCatalogProductErpIds,
  findDefaultImportCategory,
} from "@/server/repositories/erp-catalog.repository"
import { syncDefaultProductCategoriesFromERP } from "../erp-category-backfill.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
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
})
