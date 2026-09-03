import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildProductVariantUpdatePlan } from "../product-variant-update.plan"

describe("buildProductVariantUpdatePlan", () => {
  it("actualiza una variante ERP en su mismo registro y conserva stock, talla y erpId", () => {
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
          stock: 0,
          inventory: [],
          sizeUS: "7",
          sizeCM: "25",
          sizeEUR: "39",
        },
      ]
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
})
