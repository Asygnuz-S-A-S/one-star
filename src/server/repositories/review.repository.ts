import "server-only"
import { prisma } from "../db/prisma"
import type { Prisma } from "@prisma/client"

/** Solo reseñas aprobadas: son las únicas que se publican y puntúan en la ficha/SEO. */
export async function getReviewsByProduct(productId: string) {
  return prisma.productReview.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: "desc" },
  })
}

export interface CreateReviewData {
  productId: string
  userId?: string
  userName: string
  rating: number
  title?: string
  body: string
  verified?: boolean
  isApproved: boolean
  isFeatured?: boolean
}

export async function createReview(data: CreateReviewData) {
  return prisma.productReview.create({ data })
}

export async function getReviewStats(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: { productId, isApproved: true },
    select: { rating: true },
  })
  if (reviews.length === 0) return { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] }
  const count = reviews.length
  const sum = reviews.reduce((a, r) => a + r.rating, 0)
  const avg = sum / count
  const distribution = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  )
  return { avg, count, distribution }
}

export async function findReviewsForAdmin(filter: "pending" | "approved" | "featured" | "all") {
  const where: Prisma.ProductReviewWhereInput = {}
  if (filter === "pending") where.isApproved = false
  if (filter === "approved") where.isApproved = true
  if (filter === "featured") {
    where.isApproved = true
    where.isFeatured = true
  }

  return prisma.productReview.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { name: true, slug: true } } },
  })
}

export async function countPendingReviews() {
  return prisma.productReview.count({ where: { isApproved: false } })
}

/**
 * Moderación de reseña:
 * Si se desaprueba / oculta (isApproved = false), la marca de 'destacada'
 * se apaga automáticamente para garantizar que jamás se muestre una reseña no aprobada.
 */
export async function setReviewApproval(id: string, isApproved: boolean) {
  return prisma.productReview.update({
    where: { id },
    data: {
      isApproved,
      ...(isApproved ? {} : { isFeatured: false }),
    },
  })
}

export async function setReviewFeatured(id: string, isFeatured: boolean) {
  return prisma.productReview.update({
    where: { id },
    data: { isFeatured },
  })
}

export async function updateReviewRecord(
  id: string,
  data: {
    userName?: string
    rating?: number
    title?: string | null
    body?: string
    verified?: boolean
    isFeatured?: boolean
  }
) {
  return prisma.productReview.update({
    where: { id },
    data,
  })
}

export async function deleteReviewRecord(id: string) {
  return prisma.productReview.delete({ where: { id } })
}

/** Reseñas destacadas de productos de una marca específica (solo aprobadas). */
export async function findFeaturedReviewsByBrand(brandId: string, limit = 6) {
  return prisma.productReview.findMany({
    where: {
      isApproved: true,
      isFeatured: true,
      product: { brandId },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      product: { select: { name: true, slug: true } },
    },
  })
}
