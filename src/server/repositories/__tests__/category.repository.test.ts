import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const { findMany, findUnique, create } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}))

vi.mock("@/server/db/prisma", () => ({
  prisma: { category: { findMany, findUnique, create } },
}))

import {
  createCategory,
  findCategoryBySlug,
  findManyCategories,
} from "../category.repository"

beforeEach(() => vi.clearAllMocks())

describe("category.repository", () => {
  it("lista las categorías ordenadas por nombre", async () => {
    findMany.mockResolvedValue([])

    await findManyCategories()

    expect(findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } })
  })

  it("busca por slug", async () => {
    findUnique.mockResolvedValue({ id: "cat_1", slug: "hombre" })

    expect(await findCategoryBySlug("hombre")).toMatchObject({ slug: "hombre" })
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: "hombre" } })
  })

  it("devuelve null cuando el slug no existe", async () => {
    findUnique.mockResolvedValue(null)

    expect(await findCategoryBySlug("inexistente")).toBeNull()
  })

  it("crea la categoría con nombre y slug", async () => {
    create.mockResolvedValue({ id: "cat_2" })

    await createCategory({ name: "Accesorios", slug: "accesorios" })

    expect(create).toHaveBeenCalledWith({ data: { name: "Accesorios", slug: "accesorios" } })
  })
})
