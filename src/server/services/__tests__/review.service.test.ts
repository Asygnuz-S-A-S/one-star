import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/review.repository", () => ({
  getReviewsByProduct: vi.fn(),
  createReview: vi.fn(),
  getReviewStats: vi.fn(),
}))

import {
  getProductReviews,
  getProductReviewStats,
  submitProductReview,
} from "../review.service"
import {
  createReview,
  getReviewStats,
  getReviewsByProduct,
} from "@/server/repositories/review.repository"

const create = vi.mocked(createReview)
const byProduct = vi.mocked(getReviewsByProduct)
const stats = vi.mocked(getReviewStats)

const reseñaValida = {
  productId: "prod_1",
  userName: "Ana",
  rating: 5,
  body: "Excelente calzado.",
}

beforeEach(() => vi.clearAllMocks())

describe("submitProductReview", () => {
  it("guarda la reseña cuando los datos son válidos", async () => {
    create.mockResolvedValue({ id: "rev_1" } as never)

    const result = await submitProductReview(reseñaValida)

    expect(create).toHaveBeenCalledWith(reseñaValida)
    expect(result).toEqual({ id: "rev_1" })
  })

  it.each([0, 6, -1])("rechaza la calificación fuera de 1 a 5: %s", async (rating) => {
    await expect(submitProductReview({ ...reseñaValida, rating })).rejects.toThrow(
      "Rating inválido"
    )
    expect(create).not.toHaveBeenCalled()
  })

  it("rechaza un comentario que solo tiene espacios", async () => {
    await expect(submitProductReview({ ...reseñaValida, body: "   " })).rejects.toThrow(
      "El comentario no puede estar vacío"
    )
    expect(create).not.toHaveBeenCalled()
  })

  it("rechaza un nombre vacío", async () => {
    await expect(submitProductReview({ ...reseñaValida, userName: " " })).rejects.toThrow(
      "El nombre es requerido"
    )
    expect(create).not.toHaveBeenCalled()
  })

  it("acepta los extremos válidos de la calificación", async () => {
    create.mockResolvedValue({ id: "rev_2" } as never)

    await submitProductReview({ ...reseñaValida, rating: 1 })
    await submitProductReview({ ...reseñaValida, rating: 5 })

    expect(create).toHaveBeenCalledTimes(2)
  })
})

describe("consultas de reseñas", () => {
  it("delega el listado por producto al repositorio", async () => {
    byProduct.mockResolvedValue([{ id: "rev_1" }] as never)

    expect(await getProductReviews("prod_1")).toEqual([{ id: "rev_1" }])
    expect(byProduct).toHaveBeenCalledWith("prod_1")
  })

  it("delega las estadísticas al repositorio", async () => {
    stats.mockResolvedValue({ average: 4.5, count: 2 } as never)

    expect(await getProductReviewStats("prod_1")).toEqual({ average: 4.5, count: 2 })
    expect(stats).toHaveBeenCalledWith("prod_1")
  })
})
