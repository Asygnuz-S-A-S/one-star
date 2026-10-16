import "server-only"
import {
  getReviewsByProduct,
  createReview,
  getReviewStats,
  findReviewsForAdmin,
  countPendingReviews,
  setReviewApproval,
  setReviewFeatured,
  updateReviewRecord,
  deleteReviewRecord,
  findFeaturedReviewsByBrand,
} from "../repositories/review.repository"
import type { EditReviewInput } from "../validators/review.validator"

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
export async function createAdminReview(data: ReviewInput & { verified?: boolean; isFeatured?: boolean }) {
  validateReview(data)
  const payload: Parameters<typeof createReview>[0] = { ...data, isApproved: true }
  if (data.isFeatured !== undefined) payload.isFeatured = data.isFeatured
  return createReview(payload)
}

export async function listReviewsForAdmin(filter: "pending" | "approved" | "featured" | "all") {
  return findReviewsForAdmin(filter)
}

export async function getPendingReviewsCount() {
  return countPendingReviews()
}

export async function moderateReview(id: string, isApproved: boolean) {
  return setReviewApproval(id, isApproved)
}

export async function toggleFeaturedReview(id: string, isFeatured: boolean) {
  return setReviewFeatured(id, isFeatured)
}

export async function updateReview(id: string, data: Omit<EditReviewInput, "id">) {
  return updateReviewRecord(id, {
    userName: data.userName,
    rating: data.rating,
    title: data.title,
    body: data.body,
    verified: data.verified,
    isFeatured: data.isFeatured,
  })
}

export async function removeReview(id: string) {
  return deleteReviewRecord(id)
}

export async function getFeaturedReviewsForBrand(brandId: string, limit = 6) {
  return findFeaturedReviewsByBrand(brandId, limit)
}
