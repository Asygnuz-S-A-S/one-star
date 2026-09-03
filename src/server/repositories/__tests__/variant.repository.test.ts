import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { variant: { findMany } },
}))

import {
  findVariantsForPricing,
  getUniqueColors,
  getUniqueSizes,
} from "../variant.repository"

describe("variantas públicas", () => {
  it("obtiene tallas y colores únicamente desde productos publicados", async () => {
    await getUniqueSizes()
    await getUniqueColors()

    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { product: { isPublished: true } },
    }))
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { product: { isPublished: true } },
    }))
  })

  it("cotiza únicamente variantes publicadas y disponibles para compra online", async () => {
    await findVariantsForPricing(["variant-a"])

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ["variant-a"] },
        product: { isPublished: true, availableOnline: true },
      },
    }))
  })
})
