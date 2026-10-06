import "server-only"
import {
  getReviewsByProduct,
  createReview,
  getReviewStats,
  findReviewsForAdmin,
  countPendingReviews,
  setReviewApproval,
  deleteReviewRecord,
} from "../repositories/review.repository"

export async function getProductReviews(productId: string) {
  return getReviewsByProduct(productId)
}

export async function getProductReviewStats(productId: string) {
  return getReviewStats(productId)
}

interface ReviewInput {
  productId: string
  userId?: string
  userName: string
  rating: number
  title?: string
  body: string
}

function validateReview(data: ReviewInput) {
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) throw new Error("Rating inválido")
  if (!data.body.trim()) throw new Error("El comentario no puede estar vacío")
  if (data.body.length > 2000) throw new Error("El comentario es demasiado largo")
  if (!data.userName.trim()) throw new Error("El nombre es requerido")
}

/** Reseña de un cliente: queda pendiente hasta que un admin la apruebe (evita spam en el SEO). */
export async function submitProductReview(data: ReviewInput) {
  validateReview(data)
  return createReview({ ...data, isApproved: false })
}

/** Reseña cargada por un admin (p. ej. testimonios reales recibidos por otros canales): se publica directo. */
export async function createAdminReview(data: ReviewInput & { verified?: boolean }) {
  validateReview(data)
  return createReview({ ...data, isApproved: true })
}

export async function listReviewsForAdmin(filter: "pending" | "approved" | "all") {
  return findReviewsForAdmin(filter)
}

export async function getPendingReviewsCount() {
  return countPendingReviews()
}

export async function moderateReview(id: string, isApproved: boolean) {
  return setReviewApproval(id, isApproved)
}

export async function removeReview(id: string) {
  return deleteReviewRecord(id)
}
