import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const {
  brandFindMany,
  productFindFirst,
  productFindMany,
  productUpdateMany,
  prismaTransaction,
} = vi.hoisted(() => {
  const productUpdateMany = vi.fn().mockResolvedValue({ count: 2 })
  return {
    brandFindMany: vi.fn().mockResolvedValue([{ name: "Vans" }]),
    productFindFirst: vi.fn().mockResolvedValue(null),
    productFindMany: vi.fn().mockResolvedValue([]),
    productUpdateMany,
    prismaTransaction: vi.fn(
      (callback: (tx: unknown) => unknown) => callback({
        product: { updateMany: productUpdateMany },
      })
    ),
  }
})

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: prismaTransaction,
    brand: { findMany: brandFindMany },
    product: {
      findFirst: productFindFirst,
      findMany: productFindMany,
      updateMany: productUpdateMany,
    },
  },
}))

import {
  fetchBrands,
  findProductBySlug,
  findProductsByIds,
  updateProductsPublishStatus,
} from "../product.repository"

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

describe("updateProductsPublishStatus", () => {
  beforeEach(() => {
    productUpdateMany.mockResolvedValue({ count: 2 })
  })

  it("actualiza únicamente los IDs seleccionados con el estado solicitado", async () => {
    await updateProductsPublishStatus(["prod-1", "prod-2"], false)

    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["prod-1", "prod-2"] } },
      data: {
        isPublished: false,
        updatedAt: expect.any(Date),
      },
    })
    expect(prismaTransaction).toHaveBeenCalledOnce()
  })

  it("revierte la actualización cuando no encuentra todos los productos", async () => {
    productUpdateMany.mockResolvedValueOnce({ count: 1 })

    await expect(
      updateProductsPublishStatus(["prod-1", "prod-2"], false)
    ).rejects.toThrow("No se pudieron actualizar todos los productos seleccionados.")
  })
})
