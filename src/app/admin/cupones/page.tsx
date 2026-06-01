/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Coupon model exists in schema.prisma but not yet in the generated Prisma client.
// Will resolve after `prisma generate`.
import { prisma } from "@/server/db/prisma"
import CuponesClient from "./CuponesClient"

const db = prisma as any

export default async function CuponesPage() {
  let coupons: Array<{
    id: string
    code: string
    discountType: "PERCENTAGE" | "FIXED_AMOUNT"
    discountValue: number
    minOrderAmount: number | null
    maxUses: number | null
    usedCount: number
    validUntil: string
    isActive: boolean
  }> = []

  let categories: Array<{ id: string; name: string }> = []

  try {
    const [rawCoupons, rawCategories] = await Promise.all([
      db.coupon.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ])

    coupons = rawCoupons.map((c: any) => ({
      id: c.id,
      code: c.code,
      discountType: c.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
      discountValue: Number(c.discountValue),
      minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      validUntil: c.validUntil.toISOString(),
      isActive: c.isActive,
    }))

    categories = rawCategories.map((cat: any) => ({ id: cat.id, name: cat.name }))
  } catch (error) {
    console.error("[CuponesPage]", error)
  }

  return (
    <div className="p-6 md:p-8">
      <CuponesClient coupons={coupons} categories={categories} />
    </div>
  )
}
