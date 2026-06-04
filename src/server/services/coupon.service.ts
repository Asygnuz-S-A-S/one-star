import "server-only"
import {
  findManyCoupons,
  findCouponByCode,
  createCouponRecord,
  updateCouponRecord,
} from "../repositories/coupon.repository"
import type { DiscountType } from "@prisma/client"

export interface CouponInput {
  code: string
  discountType: string
  discountValue: number
  minOrderAmount?: number | null
  maxUses?: number | null
  categoryId?: string | null
  validFrom: Date
  validUntil: Date
  isActive?: boolean
}

export interface CouponDTO {
  id: string
  code: string
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  validUntil: string
  isActive: boolean
}

export async function getAllCoupons(): Promise<CouponDTO[]> {
  const coupons = await findManyCoupons()
  return coupons.map((c) => ({
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
}

export async function validateCoupon(code: string) {
  const coupon = await findCouponByCode(code)
  if (
    !coupon ||
    !coupon.isActive ||
    coupon.validUntil < new Date() ||
    coupon.validFrom > new Date()
  ) {
    return null
  }
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue.toNumber(),
  }
}

export async function couponCodeExists(code: string): Promise<boolean> {
  const coupon = await findCouponByCode(code)
  return !!coupon
}

export async function createCoupon(input: CouponInput): Promise<void> {
  await createCouponRecord({
    code: input.code,
    discountType: input.discountType as DiscountType,
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount ?? null,
    maxUses: input.maxUses ?? null,
    categoryId: input.categoryId ?? null,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    isActive: input.isActive ?? true,
  })
}

export async function toggleCouponActive(id: string, current: boolean): Promise<void> {
  await updateCouponRecord(id, { isActive: !current })
}
