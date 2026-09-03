import "server-only"
import {
  getReviewsByProduct,
  createReview,
  getReviewStats,
} from "../repositories/review.repository"

export async function getProductReviews(productId: string) {
  return getReviewsByProduct(productId)
}

export async function submitProductReview(data: {
  productId: string
  userId?: string
  userName: string
  rating: number
  title?: string
  body: string
}) {
  if (data.rating < 1 || data.rating > 5) throw new Error("Rating inválido")
  if (!data.body.trim()) throw new Error("El comentario no puede estar vacío")
  if (!data.userName.trim()) throw new Error("El nombre es requerido")
  return createReview(data)
}

export async function getProductReviewStats(productId: string) {
  return getReviewStats(productId)
}
