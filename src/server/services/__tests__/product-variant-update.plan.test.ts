import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildProductVariantUpdatePlan } from "../product-variant-update.plan"

describe("buildProductVariantUpdatePlan", () => {
  it("con ERP (isErpCatalogOwner: true): actualiza una variante ERP conservando stock y talla", () => {
    const result = buildProductVariantUpdatePlan(
      [
        {
          id: "db-variant",
          sku: "MODEL-39",
          erpId: "loggro-variant",
          size: "39",
          stock: 7,
        },
      ],
      [
        {
          sku: "MODEL-39",
          size: "talla manipulada",
          color: "Negro",
          stock: 20,
          inventory: [],
          sizeUS: "7",
          sizeCM: "25",
          sizeEUR: "39",
        },
      ],
      { isErpCatalogOwner: true }
    )

    expect(result).toEqual({
      success: true,
      updates: [
        expect.objectContaining({
          id: "db-variant",
          sku: "MODEL-39",
          size: "39",
          stock: 7,
          color: "Negro",
        }),
      ],
      creates: [],
      deleteIds: [],
    })
  })

  it("con ERP (isErpCatalogOwner: true): falla con ERP_VARIANT_MISSING si se omite una variante con erpId", () => {
    const result = buildProductVariantUpdatePlan(
      [
        {
          id: "db-variant-1",
          sku: "MODEL-39",
          erpId: "loggro-variant-1",
          size: "39",
          stock: 7,
        },
      ],
      [],
      { isErpCatalogOwner: true }
    )

    expect(result).toEqual({
      success: false,
      error: {
        code: "ERP_VARIANT_MISSING",
        message: expect.stringContaining("MODEL-39"),
      },
    })
  })

  it("con ARCHIVO (isErpCatalogOwner: false): actualiza stock y talla de una variante con erpId", () => {
    const result = buildProductVariantUpdatePlan(
      [
        {
          id: "db-variant",
          sku: "MODEL-39",
          erpId: "loggro-variant",
          size: "39",
          stock: 0,
        },
      ],
      [
        {
          sku: "MODEL-39",
          size: "39.5",
          color: "Negro",
          stock: 15,
          inventory: [{ storeLocationId: null, stock: 15 }],
          sizeUS: "7.5",
          sizeCM: "25.5",
          sizeEUR: "39.5",
        },
      ],
      { isErpCatalogOwner: false }
    )

    expect(result).toEqual({
      success: true,
      updates: [
        expect.objectContaining({
          id: "db-variant",
          sku: "MODEL-39",
          size: "39.5",
          stock: 15,
          color: "Negro",
        }),
      ],
      creates: [],
      deleteIds: [],
    })
  })

  it("con ARCHIVO (isErpCatalogOwner: false): permite eliminar variantes aunque tengan erpId", () => {
    const result = buildProductVariantUpdatePlan(
      [
        {
          id: "db-variant-1",
          sku: "MODEL-39",
          erpId: "loggro-variant-1",
          size: "39",
          stock: 0,
        },
      ],
      [],
      { isErpCatalogOwner: false }
    )

    expect(result).toEqual({
      success: true,
      updates: [],
      creates: [],
      deleteIds: ["db-variant-1"],
    })
  })
})
