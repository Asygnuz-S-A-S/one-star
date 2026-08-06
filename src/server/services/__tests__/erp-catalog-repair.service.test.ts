import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-catalog-repair.repository", () => ({
  applyErpCatalogRepairPlan: vi.fn(),
  loadErpCatalogRepairState: vi.fn(),
}))

import { getERPAdapter } from "@/server/erp"
import { loadErpCatalogRepairState } from "@/server/repositories/erp-catalog-repair.repository"
import { repairErpCatalog } from "../erp-catalog-repair.service"

const mockGetERPAdapter = vi.mocked(getERPAdapter)
const mockLoadState = vi.mocked(loadErpCatalogRepairState)

describe("repairErpCatalog", () => {
  beforeEach(() => vi.clearAllMocks())

  it("genera un dry-run aun cuando el snapshot de stock está bloqueado en cero", async () => {
    mockGetERPAdapter.mockReturnValue({
      ping: vi.fn(),
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          {
            erpId: "parent-1",
            sku: "MODEL",
            name: "Modelo",
            basePrice: 100_000,
            variants: [
              { erpId: "variant-1", sku: "MODEL-39", name: "Modelo 39", basePrice: 100_000, stock: 0 },
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
          missingCodes: [],
          errors: [],
          totalStock: 0,
        },
      }),
    } as never)
    mockLoadState.mockResolvedValue([
      {
        id: "product-1",
        erpId: "parent-1",
        slug: "MODEL",
        protectedDataCount: 0,
        variants: [
          { id: "false-definition", erpId: "parent-1", sku: "MODEL", protectedDataCount: 0 },
          { id: "db-variant-1", erpId: "variant-1", sku: "MODEL-39", protectedDataCount: 0 },
        ],
      },
    ])

    const result = await repairErpCatalog({ mode: "preview" })

    expect(result).toMatchObject({
      success: true,
      data: {
        mode: "preview",
        products: 1,
        variants: 1,
        deleteVariants: 1,
      },
    })
  })
})
