import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/erp", () => ({ getERPAdapter: vi.fn() }))
vi.mock("@/server/repositories/erp-color-family.repository", () => ({
  applyErpColorFamilyKeyUpdates: vi.fn(),
  findErpColorFamilyBackfillProducts: vi.fn(),
  fingerprintErpColorFamilyReconciliation: vi.fn(() => "preview-hash"),
}))

import { getERPAdapter } from "@/server/erp"
import { findErpColorFamilyBackfillProducts } from "@/server/repositories/erp-color-family.repository"
import {
  applyErpColorFamilyBackfill,
  previewErpColorFamilyBackfill,
} from "../erp-color-family-backfill.service"

describe("previewErpColorFamilyBackfill", () => {
  beforeEach(() => vi.clearAllMocks())

  it("cuenta familias a crear sin escribir datos", async () => {
    vi.mocked(findErpColorFamilyBackfillProducts).mockResolvedValue([
      {
        id: "a",
        slug: "180361BKNT",
        erpId: "erp-a",
        brandErpId: "004",
        erpColorFamilyKey: null,
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Negro"],
        eligible: false,
      },
      {
        id: "b",
        slug: "180361GRN",
        erpId: "erp-b",
        brandErpId: "004",
        erpColorFamilyKey: null,
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Verde"],
        eligible: false,
      },
    ])
    vi.mocked(getERPAdapter).mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [
          { erpId: "erp-a", colorFamilyKey: "loggro:004:180361" },
          { erpId: "erp-b", colorFamilyKey: "loggro:004:180361" },
        ],
      }),
    } as never)

    const result = await previewErpColorFamilyBackfill()

    expect(result).toMatchObject({
      dryRun: true,
      fingerprint: "preview-hash",
      recognizedProductCount: 2,
      changedKeyCount: 2,
      familiesToCreate: 1,
      familiesToUpdate: 0,
    })
    expect(result.unrecognizedProducts).toEqual([])
  })

  it("identifica qué productos quedaron sin formato de código reconocido", async () => {
    vi.mocked(findErpColorFamilyBackfillProducts).mockResolvedValue([
      {
        id: "unknown",
        slug: "RV8-DEO",
        erpId: "erp-unknown",
        brandErpId: "008",
        erpColorFamilyKey: null,
        colorFamilyId: null,
        colorFamilyErpKey: null,
        colors: ["Dorado"],
        eligible: false,
      },
    ])
    vi.mocked(getERPAdapter).mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({
        groups: [{ erpId: "erp-unknown", sku: "RV8-DEO" }],
      }),
    } as never)

    const result = await previewErpColorFamilyBackfill()

    expect(result.unrecognizedProducts).toEqual([
      {
        productId: "unknown",
        slug: "RV8-DEO",
        erpId: "erp-unknown",
        reason: "UNRECOGNIZED_FORMAT",
      },
    ])
  })

  it("rechaza el apply cuando el fingerprint no corresponde al preview actual", async () => {
    vi.mocked(findErpColorFamilyBackfillProducts).mockResolvedValue([])
    vi.mocked(getERPAdapter).mockReturnValue({
      fetchCatalog: vi.fn().mockResolvedValue({ groups: [] }),
    } as never)

    await expect(applyErpColorFamilyBackfill("hash-anterior")).rejects.toThrow(
      "ya no coincide"
    )
  })
})
