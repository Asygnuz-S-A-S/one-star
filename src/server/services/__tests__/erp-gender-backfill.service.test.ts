import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  fillMissingCatalogProductGenders: vi.fn(),
  findMissingCatalogProductErpIds: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import { fillMissingCatalogProductGenders } from "@/server/repositories/erp-catalog.repository"
import { findMissingCatalogProductErpIds } from "@/server/repositories/erp-catalog.repository"
import { syncMissingProductGendersFromERP } from "../erp-gender-backfill.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockFillMissingGenders = vi.mocked(fillMissingCatalogProductGenders)
const mockFindMissingErpIds = vi.mocked(findMissingCatalogProductErpIds)

describe("syncMissingProductGendersFromERP", () => {
  beforeEach(() => vi.clearAllMocks())

  it("previsualiza únicamente grupos clasificados sin escribir", async () => {
    mockFindMissingErpIds.mockResolvedValue(["erp-men"])
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
      candidateCount: 1,
      unclassifiedCount: 1,
      updatedCount: 0,
      fingerprint: expect.any(String),
    })
    expect(mockFindMissingErpIds).toHaveBeenCalledWith([
      "erp-men",
      "erp-unisex",
    ])
    expect(mockFillMissingGenders).not.toHaveBeenCalled()
  })

  it("rechaza una aplicación sin la huella aprobada", async () => {
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn(),
    } as never)

    await expect(
      syncMissingProductGendersFromERP({ dryRun: false } as never)
    ).rejects.toThrow("huella")
    expect(mockFillMissingGenders).not.toHaveBeenCalled()
  })

  it("aplica únicamente los candidatos normalizados cuando se confirma", async () => {
    mockFillMissingGenders.mockResolvedValue(1)
    mockFindMissingErpIds.mockResolvedValue(["erp-women"])
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          { erpId: "erp-women", gender: "MUJER", variants: [] },
          { erpId: "erp-unknown", variants: [] },
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

    const preview = await syncMissingProductGendersFromERP({ dryRun: true })
    const result = await syncMissingProductGendersFromERP({
      dryRun: false,
      fingerprint: preview.fingerprint!,
    })

    expect(mockFillMissingGenders).toHaveBeenCalledWith([
      { erpId: "erp-women", gender: "MUJER" },
    ])
    expect(result).toEqual({
      dryRun: false,
      candidateCount: 1,
      unclassifiedCount: 1,
      updatedCount: 1,
      fingerprint: preview.fingerprint,
    })
    expect(mockFindMissingErpIds).toHaveBeenCalledTimes(2)
  })
})
