"use server"

import { findCouponByCode } from "@/server/repositories/coupon.repository"

export interface ApplyCouponResult {
  valid: boolean
  code?: string
  discountType?: "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue?: number
  minOrderAmount?: number | null
  error?: string
}

export async function applyCoupon(
  code: string,
  subtotal: number
): Promise<ApplyCouponResult> {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) {
    return { valid: false, error: "Ingresa un código de cupón." }
  }

  const coupon = await findCouponByCode(trimmed)
  const now = new Date()

  if (
    !coupon ||
    !coupon.isActive ||
    coupon.validUntil < now ||
    coupon.validFrom > now ||
    (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
  ) {
    return { valid: false, error: "Cupón inválido o expirado." }
  }

  const minOrder = coupon.minOrderAmount ? coupon.minOrderAmount.toNumber() : null
  if (minOrder !== null && subtotal < minOrder) {
    return {
      valid: false,
      error: `Este cupón aplica para pedidos mayores a $${minOrder.toLocaleString("es-CO")}.`,
    }
  }

  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: coupon.discountValue.toNumber(),
    minOrderAmount: minOrder,
  }
}
