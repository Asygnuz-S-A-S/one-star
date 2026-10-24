"use server"

import { headers } from "next/headers"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { captureAbandonedCart } from "@/server/services/abandoned-cart.service"

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
    const rateLimit = await consumePublicRateLimit("abandoned-cart", headerList, {
      max: 10,
      windowMs: 60_000,
    })
    if (!rateLimit.allowed) return

    const session = await auth.api.getSession({ headers: headerList })
    const userId = session?.user?.id ?? null

    await captureAbandonedCart(parsed.data.email, parsed.data.items, userId)
  } catch (error) {
    console.error("[captureAbandonedCartAction]", error)
  }
}
