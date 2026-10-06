import "server-only"
import { prisma } from "../db/prisma"

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

export async function findReviewsForAdmin(filter: "pending" | "approved" | "all") {
  return prisma.productReview.findMany({
    where: filter === "all" ? {} : { isApproved: filter === "approved" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { name: true, slug: true } } },
  })
}

export async function countPendingReviews() {
  return prisma.productReview.count({ where: { isApproved: false } })
}

export async function setReviewApproval(id: string, isApproved: boolean) {
  return prisma.productReview.update({ where: { id }, data: { isApproved } })
}

export async function deleteReviewRecord(id: string) {
  return prisma.productReview.delete({ where: { id } })
}
