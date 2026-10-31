"use server"

import { headers } from "next/headers"
import type { GiftCardOption } from "@/lib/gift-card"
import { ensureCustomGiftCardOption } from "@/server/services/gift-card.service"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"

export type CustomGiftCardResult =
  | { success: true; option: GiftCardOption }
  | { success: false; error: string }

/** Tarjeta de regalo con el monto que escribe el cliente (dentro de los límites del admin). */
export async function customGiftCardOptionAction(amount: unknown): Promise<CustomGiftCardResult> {
  const value = typeof amount === "number" ? amount : Number.NaN
  if (!Number.isInteger(value)) return { success: false, error: "Escribe un monto válido." }

  // Cada monto nuevo crea un producto: se limita para que nadie llene el catálogo.
  const limit = await consumePublicRateLimit("gift_card_custom", await headers(), { max: 20, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) return { success: false, error: "Demasiados intentos. Intenta de nuevo más tarde." }

  const option = await ensureCustomGiftCardOption(value)
  return option
    ? { success: true, option }
    : { success: false, error: "Ese monto no está disponible. Revisa el mínimo, el máximo y que sea en miles." }
}
