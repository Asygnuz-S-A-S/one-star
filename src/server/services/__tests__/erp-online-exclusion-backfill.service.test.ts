import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-catalog.repository", () => ({
  findPublishedCatalogProducts: vi.fn(),
  unpublishCatalogProducts: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import {
  findPublishedCatalogProducts,
  unpublishCatalogProducts,
} from "@/server/repositories/erp-catalog.repository"
import { syncOnlineCatalogExclusionsFromERP } from "../erp-online-exclusion-backfill.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockFindPublishedProducts = vi.mocked(findPublishedCatalogProducts)
const mockUnpublishProducts = vi.mocked(unpublishCatalogProducts)
const baselineUpdatedAt = new Date("2026-08-13T14:00:00.000Z")

describe("syncOnlineCatalogExclusionsFromERP", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("previsualiza únicamente productos ERP que todavía están visibles online", async () => {
    mockFindPublishedProducts.mockResolvedValue([
      { erpId: "erp-bag", updatedAt: baselineUpdatedAt },
      { erpId: "erp-gift", updatedAt: baselineUpdatedAt },
    ])
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-bag",
            name: "BOLSA TELA GRIS GRANDE",
            onlineCatalogExclusionReason: "INTERNAL_ITEM",
            variants: [],
          },
          {
            erpId: "erp-gift",
            name: "CORDONES OBSEQUIO",
            onlineCatalogExclusionReason: "GIFT",
            variants: [],
          },
          {
            erpId: "erp-hidden",
            name: "NIKE TEST",
            onlineCatalogExclusionReason: "TEST_ITEM",
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

    const result = await syncOnlineCatalogExclusionsFromERP({ dryRun: true })

    expect(result).toEqual({
      dryRun: true,
      candidateCount: 2,
      counts: { INTERNAL_ITEM: 1, GIFT: 1 },
      candidates: [
        { erpId: "erp-bag", name: "BOLSA TELA GRIS GRANDE", reason: "INTERNAL_ITEM" },
        { erpId: "erp-gift", name: "CORDONES OBSEQUIO", reason: "GIFT" },
      ],
      updatedCount: 0,
      fingerprint: expect.any(String),
    })
    expect(mockUnpublishProducts).not.toHaveBeenCalled()
  })

  it("aplica exactamente la vista previa aprobada mediante actualizaciones condicionales", async () => {
    mockFindPublishedProducts.mockResolvedValue([
      { erpId: "erp-bag", updatedAt: baselineUpdatedAt },
      { erpId: "erp-gift", updatedAt: baselineUpdatedAt },
    ])
    mockUnpublishProducts.mockResolvedValue(2)
    mockGetERPAdapter.mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "erp-bag",
            name: "BOLSA TELA GRIS GRANDE",
            onlineCatalogExclusionReason: "INTERNAL_ITEM",
            variants: [],
          },
          {
            erpId: "erp-gift",
            name: "CORDONES OBSEQUIO",
            onlineCatalogExclusionReason: "GIFT",
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

    const preview = await syncOnlineCatalogExclusionsFromERP({ dryRun: true })
    const result = await syncOnlineCatalogExclusionsFromERP({
      dryRun: false,
      fingerprint: preview.fingerprint,
    })

    expect(mockUnpublishProducts).toHaveBeenCalledWith([
      { erpId: "erp-bag", updatedAt: baselineUpdatedAt },
      { erpId: "erp-gift", updatedAt: baselineUpdatedAt },
    ])
    expect(result).toEqual({ ...preview, dryRun: false, updatedCount: 2 })
  })

  it("rechaza una huella obsoleta antes de ocultar productos", async () => {
    mockFindPublishedProducts
      .mockResolvedValueOnce([{ erpId: "erp-bag", updatedAt: baselineUpdatedAt }])
      .mockResolvedValueOnce([{ erpId: "erp-gift", updatedAt: baselineUpdatedAt }])
    const commonSnapshot = {
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
        ...commonSnapshot,
        groups: [{
          erpId: "erp-bag",
          name: "BOLSA TELA GRIS GRANDE",
          onlineCatalogExclusionReason: "INTERNAL_ITEM",
          variants: [],
        }],
      })
      .mockResolvedValueOnce({
        ...commonSnapshot,
        groups: [{
          erpId: "erp-gift",
          name: "CORDONES OBSEQUIO",
          onlineCatalogExclusionReason: "GIFT",
          variants: [],
        }],
      })
    mockGetERPAdapter.mockReturnValue({ fetchCatalog } as never)

    const preview = await syncOnlineCatalogExclusionsFromERP({ dryRun: true })

    await expect(syncOnlineCatalogExclusionsFromERP({
      dryRun: false,
      fingerprint: preview.fingerprint,
    })).rejects.toThrow("La vista previa de disponibilidad online cambió")
    expect(mockUnpublishProducts).not.toHaveBeenCalled()
  })
})
