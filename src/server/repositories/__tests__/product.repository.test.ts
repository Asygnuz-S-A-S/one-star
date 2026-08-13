import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { brandFindMany, productFindFirst, productFindMany } = vi.hoisted(() => ({
  brandFindMany: vi.fn().mockResolvedValue([{ name: "Vans" }]),
  productFindFirst: vi.fn().mockResolvedValue(null),
  productFindMany: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    brand: { findMany: brandFindMany },
    product: { findFirst: productFindFirst, findMany: productFindMany },
  },
}))

import { fetchBrands, findProductBySlug, findProductsByIds } from "../product.repository"

describe("fetchBrands", () => {
  it("lista solo marcas activas que tienen productos visibles online", async () => {
    const brands = await fetchBrands()

    expect(brandFindMany).toHaveBeenCalledWith({
      select: { name: true },
      where: {
        isActive: true,
        products: { some: { isPublished: true } },
      },
      orderBy: { name: "asc" },
    })
    expect(brands).toEqual(["Vans"])
  })
})

describe("findProductBySlug", () => {
  it("exige visibilidad online y filtra también los cross-sells públicos", async () => {
    await findProductBySlug("producto-publico")

    expect(productFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: "producto-publico", isPublished: true },
      include: expect.objectContaining({
        crossSells: expect.objectContaining({ where: { isPublished: true } }),
      }),
    }))
  })
})

describe("findProductsByIds", () => {
  it("vuelve a exigir visibilidad online para cerrar cambios concurrentes", async () => {
    await findProductsByIds(["product-a", "product-b"])

    expect(productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: { in: ["product-a", "product-b"] },
        isPublished: true,
      },
    }))
  })
})
