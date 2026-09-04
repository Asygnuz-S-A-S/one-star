import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const m = vi.hoisted(() => ({ findMany: vi.fn(), create: vi.fn() }))

vi.mock("@/server/db/prisma", () => ({
  prisma: { productReview: m },
}))

import { createReview, getReviewStats, getReviewsByProduct } from "../review.repository"

beforeEach(() => vi.clearAllMocks())

describe("getReviewsByProduct", () => {
  it("devuelve las reseñas más recientes primero", async () => {
    m.findMany.mockResolvedValue([])

    await getReviewsByProduct("prod_1")

    expect(m.findMany).toHaveBeenCalledWith({
      where: { productId: "prod_1" },
      orderBy: { createdAt: "desc" },
    })
  })
})

describe("createReview", () => {
  it("guarda la reseña tal como llega del servicio, que ya la validó", async () => {
    m.create.mockResolvedValue({ id: "rev_1" })

    await createReview({ productId: "prod_1", userName: "Ana", rating: 5, body: "Buena" })

    expect(m.create).toHaveBeenCalledWith({
      data: { productId: "prod_1", userName: "Ana", rating: 5, body: "Buena" },
    })
  })
})

describe("getReviewStats", () => {
  it("devuelve ceros cuando el producto no tiene reseñas", async () => {
    m.findMany.mockResolvedValue([])

    expect(await getReviewStats("prod_1")).toEqual({
      avg: 0,
      count: 0,
      distribution: [0, 0, 0, 0, 0],
    })
  })

  it("promedia las calificaciones y las distribuye de 5 a 1 estrellas", async () => {
    m.findMany.mockResolvedValue([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
      { rating: 1 },
    ])

    expect(await getReviewStats("prod_1")).toEqual({
      avg: 3.75,
      count: 4,
      distribution: [2, 1, 0, 0, 1],
    })
  })
})
