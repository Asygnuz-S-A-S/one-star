import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { updateMany, transaction } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
    Promise.all(operations)
  ),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    product: { updateMany },
    $transaction: transaction,
  },
}))

import { fillMissingCatalogProductGenders } from "../erp-catalog.repository"

describe("fillMissingCatalogProductGenders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
  })

  it("actualiza solo géneros vacíos y devuelve el total realmente modificado", async () => {
    const updated = await fillMissingCatalogProductGenders([
      { erpId: "erp-men", gender: "HOMBRE" },
      { erpId: "erp-women", gender: "MUJER" },
    ])

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { erpId: "erp-men", gender: null },
      data: { gender: "HOMBRE" },
    })
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { erpId: "erp-women", gender: null },
      data: { gender: "MUJER" },
    })
    expect(transaction).toHaveBeenCalledOnce()
    expect(updated).toBe(1)
  })
})
