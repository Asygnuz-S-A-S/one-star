"use server"

import { headers } from "next/headers"
import { z } from "zod"
import { validateCouponForOrder } from "@/server/services/coupon.service"

/** Rate limiting en memoria por IP (se reinicia al reiniciar el proceso). */
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 15

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (record && now < record.resetAt) {
    if (record.count >= MAX_ATTEMPTS) return true
    record.count++
    return false
  }
  attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  return false
}

const inputSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().nonnegative().finite(),
})

export interface CouponValidationResult {
  valid: boolean
  code?: string
  discountAmount?: number
  error?: string
}

/**
 * Valida un cupón para el checkout. Pública (el cliente aún no tiene pedido),
 * solo lectura; el descuento definitivo se recalcula en `placeOrder`.
 */
export async function validateCouponAction(
  code: string,
  subtotal: number
): Promise<CouponValidationResult> {
  const parsed = inputSchema.safeParse({ code, subtotal })
  if (!parsed.success) {
    return { valid: false, error: "Cupón no válido" }
  }

  const headerList = await headers()
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(ip)) {
    return { valid: false, error: "Demasiados intentos. Espera un minuto." }
  }

  try {
    const result = await validateCouponForOrder(parsed.data.code, parsed.data.subtotal)
    if (!result.valid) {
      return { valid: false, error: result.reason }
    }
    return { valid: true, code: result.code, discountAmount: result.discountAmount }
  } catch (error) {
    console.error("[validateCouponAction]", error)
    return { valid: false, error: "No se pudo validar el cupón. Intenta de nuevo." }
  }
}
