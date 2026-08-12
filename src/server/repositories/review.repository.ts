import "server-only"
import { prisma } from "../db/prisma"

export async function getReviewsByProduct(productId: string) {
  return prisma.productReview.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createReview(data: {
  productId: string
  userId?: string
  userName: string
  rating: number
  title?: string
  body: string
}) {
  return prisma.productReview.create({ data })
}

export async function getReviewStats(productId: string) {
  const reviews = await prisma.productReview.findMany({
    where: { productId },
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
