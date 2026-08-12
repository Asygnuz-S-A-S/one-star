"use server"

import { headers } from "next/headers"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { captureAbandonedCart } from "@/server/services/abandoned-cart.service"

/** Rate limiting en memoria por IP (se reinicia al reiniciar el proceso). */
const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_CAPTURES = 10

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (record && now < record.resetAt) {
    if (record.count >= MAX_CAPTURES) return true
    record.count++
    return false
  }
  attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  return false
}

const captureSchema = z.object({
  email: z.string().trim().email().max(254),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(64),
        variantId: z.string().min(1).max(64),
        name: z.string().min(1).max(200),
        size: z.string().max(40).optional(),
        quantity: z.number().int().positive().max(50),
        price: z.number().nonnegative().finite(),
        imageUrl: z.string().max(500).nullable().optional(),
      })
    )
    .min(1)
    .max(100),
})

export type AbandonedCartCaptureInput = z.infer<typeof captureSchema>

/**
 * Guarda el carrito de quien inició el checkout (email + ítems) para poder
 * recuperarlo desde el admin si no completa la compra. Fire-and-forget desde
 * el cliente: nunca lanza, para no interferir con el flujo de compra.
 */
export async function captureAbandonedCartAction(
  input: AbandonedCartCaptureInput
): Promise<void> {
  try {
    const parsed = captureSchema.safeParse(input)
    if (!parsed.success) return

    const headerList = await headers()
    const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
    if (isRateLimited(ip)) return

    const session = await auth.api.getSession({ headers: headerList })
    const userId = session?.user?.id ?? null

    await captureAbandonedCart(parsed.data.email, parsed.data.items, userId)
  } catch (error) {
    console.error("[captureAbandonedCartAction]", error)
  }
}
