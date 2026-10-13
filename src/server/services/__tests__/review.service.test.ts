import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

vi.mock("@/server/repositories/review.repository", () => ({
  getReviewsByProduct: vi.fn(),
  createReview: vi.fn(),
  getReviewStats: vi.fn(),
  findReviewsForAdmin: vi.fn(),
  countPendingReviews: vi.fn(),
  setReviewApproval: vi.fn(),
  deleteReviewRecord: vi.fn(),
}))

import {
  getProductReviews,
  getProductReviewStats,
  submitProductReview,
  createAdminReview,
  moderateReview,
} from "../review.service"
import {
  createReview,
  getReviewStats,
  getReviewsByProduct,
  setReviewApproval,
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
  it("guarda la reseña de un cliente como pendiente de aprobación", async () => {
    create.mockResolvedValue({ id: "rev_1" } as never)

    const result = await submitProductReview(reseñaValida)

    expect(create).toHaveBeenCalledWith({ ...reseñaValida, isApproved: false })
    expect(result).toEqual({ id: "rev_1" })
  })

  it("rechaza un comentario demasiado largo", async () => {
    await expect(
      submitProductReview({ ...reseñaValida, body: "a".repeat(2001) })
    ).rejects.toThrow("demasiado largo")
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

describe("moderación", () => {
  it("una reseña cargada por un admin se publica directo", async () => {
    create.mockResolvedValue({ id: "rev_2" } as never)

    await createAdminReview({ ...reseñaValida, verified: true })

    expect(create).toHaveBeenCalledWith({ ...reseñaValida, verified: true, isApproved: true })
  })

  it("aprobar u ocultar delega en el repositorio", async () => {
    await moderateReview("rev_1", true)

    expect(vi.mocked(setReviewApproval)).toHaveBeenCalledWith("rev_1", true)
  })
})
