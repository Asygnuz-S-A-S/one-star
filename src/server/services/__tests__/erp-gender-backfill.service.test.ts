import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  fillMissingCatalogProductGenders: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import { fillMissingCatalogProductGenders } from "@/server/repositories/erp-catalog.repository"
import { syncMissingProductGendersFromERP } from "../erp-gender-backfill.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockFillMissingGenders = vi.mocked(fillMissingCatalogProductGenders)

describe("syncMissingProductGendersFromERP", () => {
  beforeEach(() => vi.clearAllMocks())

  it("previsualiza únicamente grupos clasificados sin escribir", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          { erpId: "erp-men", gender: "HOMBRE", variants: [] },
          { erpId: "erp-unisex", gender: "UNISEX", variants: [] },
          { erpId: "erp-unknown", variants: [] },
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

    const result = await syncMissingProductGendersFromERP({ dryRun: true })

    expect(result).toEqual({
      dryRun: true,
      candidateCount: 2,
      unclassifiedCount: 1,
      updatedCount: 0,
    })
    expect(mockFillMissingGenders).not.toHaveBeenCalled()
  })
})
