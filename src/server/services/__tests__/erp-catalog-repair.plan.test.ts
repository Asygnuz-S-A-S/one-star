import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { buildErpCatalogRepairPlan } from "../erp-catalog-repair.plan"

describe("buildErpCatalogRepairPlan", () => {
  it("conserva el producto padre, reúne sus variantes y elimina el producto duplicado", () => {
    const result = buildErpCatalogRepairPlan(
      [
        {
          erpId: "parent-1",
          sku: "MODEL-NEGRO",
          name: "Tenis modelo negro",
          basePrice: 100_000,
          variants: [
            {
              erpId: "variant-1",
              sku: "MODEL-NEGRO-39",
              name: "Tenis modelo negro 39",
              basePrice: 100_000,
              stock: 2,
            },
            {
              erpId: "variant-2",
              sku: "MODEL-NEGRO-40",
              name: "Tenis modelo negro 40",
              basePrice: 100_000,
              stock: 1,
            },
          ],
        },
      ],
      [
        {
          id: "product-parent",
          erpId: "parent-1",
          slug: "MODEL-NEGRO",
          protectedDataCount: 0,
          variants: [
            { id: "false-definition", erpId: "parent-1", sku: "MODEL-NEGRO" },
            { id: "db-variant-1", erpId: "variant-1", sku: "MODEL-NEGRO-39" },
          ],
        },
        {
          id: "product-duplicate",
          erpId: "variant-2",
          slug: "MODEL-NEGRO-40",
          protectedDataCount: 0,
          variants: [
            { id: "db-variant-2", erpId: "variant-2", sku: "MODEL-NEGRO-40" },
          ],
        },
      ]
    )

    expect(result).toMatchObject({
      success: true,
      plan: {
        deleteVariantIds: ["false-definition"],
        deleteProductIds: ["product-duplicate"],
        moveVariants: [
          { variantId: "db-variant-2", targetProductId: "product-parent" },
        ],
      },
    })
  })

  it("promueve como padre el producto que ya reúne más variantes cuando falta la definición", () => {
    const result = buildErpCatalogRepairPlan(
      [
        {
          erpId: "parent-1",
          sku: "MODEL-NEGRO",
          name: "Tenis modelo negro",
          basePrice: 100_000,
          variants: [
            { erpId: "variant-1", sku: "MODEL-39", name: "Modelo 39", basePrice: 100_000, stock: 1 },
            { erpId: "variant-2", sku: "MODEL-40", name: "Modelo 40", basePrice: 100_000, stock: 1 },
            { erpId: "variant-3", sku: "MODEL-41", name: "Modelo 41", basePrice: 100_000, stock: 1 },
          ],
        },
      ],
      [
        {
          id: "candidate-one",
          erpId: "variant-1",
          slug: "MODEL-39",
          protectedDataCount: 0,
          variants: [{ id: "db-1", erpId: "variant-1", sku: "MODEL-39" }],
        },
        {
          id: "candidate-two",
          erpId: "variant-2",
          slug: "MODEL-40",
          protectedDataCount: 0,
          variants: [
            { id: "db-2", erpId: "variant-2", sku: "MODEL-40" },
            { id: "db-3", erpId: "variant-3", sku: "MODEL-41" },
          ],
        },
      ]
    )

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.plan.targetProducts[0].productId).toBe("candidate-two")
    expect(result.plan.deleteProductIds).toEqual(["candidate-one"])
  })
})
