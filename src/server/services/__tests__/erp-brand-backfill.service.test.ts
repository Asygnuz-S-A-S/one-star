import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  ensureCatalogBrand: vi.fn(),
  findProvisionalCatalogProductBrands: vi.fn(),
  replaceProvisionalCatalogProductBrands: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import {
  ensureCatalogBrand,
  findProvisionalCatalogProductBrands,
  replaceProvisionalCatalogProductBrands,
} from "@/server/repositories/erp-catalog.repository"
import { syncProvisionalProductBrandsFromERP } from "../erp-brand-backfill.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockEnsureBrand = vi.mocked(ensureCatalogBrand)
const mockFindProvisionalBrands = vi.mocked(findProvisionalCatalogProductBrands)
const mockReplaceProvisionalBrands = vi.mocked(replaceProvisionalCatalogProductBrands)

describe("syncProvisionalProductBrandsFromERP", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("previsualiza únicamente productos que conservan la marca provisional exacta", async () => {
    mockFindProvisionalBrands.mockResolvedValue([
      { erpId: "erp-columbia", brandErpId: "008", brandName: "Por nombrar (008)" },
      { erpId: "erp-converse", brandErpId: "001", brandName: "Por nombrar (001)" },
    ])
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-columbia",
            brandErpId: "008",
            brandSuggestion: { slug: "columbia", name: "Columbia" },
            variants: [],
          },
          {
            erpId: "erp-converse",
            brandErpId: "001",
            brandSuggestion: { slug: "converse", name: "Converse" },
            variants: [],
          },
          {
            erpId: "erp-manual",
            brandErpId: "004",
            brandSuggestion: { slug: "skechers", name: "Skechers" },
            variants: [],
          },
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

    const result = await syncProvisionalProductBrandsFromERP({ dryRun: true })

    expect(result).toEqual({
      dryRun: true,
      candidateCount: 2,
      counts: { columbia: 1, converse: 1 },
      updatedCount: 0,
      deletedProvisionalBrandCount: 0,
      fingerprint: expect.any(String),
    })
    expect(mockReplaceProvisionalBrands).not.toHaveBeenCalled()
  })

  it("aplica la huella aprobada y delega el reemplazo condicional de marcas", async () => {
    mockFindProvisionalBrands.mockResolvedValue([
      { erpId: "erp-columbia", brandErpId: "008", brandName: "Por nombrar (008)" },
      { erpId: "erp-converse", brandErpId: "001", brandName: "Por nombrar (001)" },
    ])
    mockEnsureBrand.mockImplementation(async ({ slug, name }) => ({
      id: `${slug}-id`,
      slug,
      name,
    }) as never)
    mockReplaceProvisionalBrands.mockResolvedValue({
      updatedCount: 2,
      deletedProvisionalBrandCount: 2,
    })
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-columbia",
            brandErpId: "008",
            brandSuggestion: { slug: "columbia", name: "Columbia" },
            variants: [],
          },
          {
            erpId: "erp-converse",
            brandErpId: "001",
            brandSuggestion: { slug: "converse", name: "Converse" },
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

    const preview = await syncProvisionalProductBrandsFromERP({ dryRun: true })
    const result = await syncProvisionalProductBrandsFromERP({
      dryRun: false,
      fingerprint: preview.fingerprint,
    })

    expect(mockReplaceProvisionalBrands).toHaveBeenCalledWith([
      {
        erpId: "erp-columbia",
        sourceBrandErpId: "008",
        targetBrandId: "columbia-id",
      },
      {
        erpId: "erp-converse",
        sourceBrandErpId: "001",
        targetBrandId: "converse-id",
      },
    ])
    expect(result).toEqual({
      ...preview,
      dryRun: false,
      updatedCount: 2,
      deletedProvisionalBrandCount: 2,
    })
  })

  it("rechaza una huella obsoleta antes de crear o reemplazar marcas", async () => {
    mockFindProvisionalBrands
      .mockResolvedValueOnce([
        { erpId: "erp-converse", brandErpId: "001", brandName: "Por nombrar (001)" },
      ])
      .mockResolvedValueOnce([
        { erpId: "erp-vans", brandErpId: "003", brandName: "Por nombrar (003)" },
      ])
    const catalogBase = {
      diagnostics: {
        sourceItemCount: 1,
        definitionCount: 1,
        variantCount: 0,
        groupCount: 1,
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
    } as const
    const fetchCatalog = vi.fn()
      .mockResolvedValueOnce({
        ...catalogBase,
        groups: [{
          erpId: "erp-converse",
          brandErpId: "001",
          brandSuggestion: { slug: "converse", name: "Converse" },
          variants: [],
        }],
      })
      .mockResolvedValueOnce({
        ...catalogBase,
        groups: [{
          erpId: "erp-vans",
          brandErpId: "003",
          brandSuggestion: { slug: "vans", name: "Vans" },
          variants: [],
        }],
      })
    mockGetERPAdapter.mockReturnValue({ fetchCatalog } as never)

    const preview = await syncProvisionalProductBrandsFromERP({ dryRun: true })

    await expect(syncProvisionalProductBrandsFromERP({
      dryRun: false,
      fingerprint: preview.fingerprint,
    })).rejects.toThrow("La vista previa de marcas cambió")
    expect(mockEnsureBrand).not.toHaveBeenCalled()
    expect(mockReplaceProvisionalBrands).not.toHaveBeenCalled()
  })
})
