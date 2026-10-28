"use server"

import { cookies } from "next/headers"
import { LEAD_COOKIE_NAME, verifyLeadCookieValue } from "@/lib/lead-cookie"
import { advanceStage } from "@/server/services/lead.service"

/**
 * Avanza el lead de WhatsApp (si existe cookie `os_lead`) a la etapa `CARRITO`.
 * Fire-and-forget: nunca lanza excepciones para no interrumpir el carrito.
 */
export async function trackLeadCartStageAction(metadata?: {
  productId?: string
  variantId?: string
  productName?: string
}): Promise<void> {
  try {
    const cookieStore = await cookies()
    const rawCookie = cookieStore.get(LEAD_COOKIE_NAME)?.value
    const leadId = verifyLeadCookieValue(rawCookie)
    if (!leadId) return

    await advanceStage(leadId, "CARRITO", metadata)
  } catch (error) {
    console.error("[trackLeadCartStageAction] Error al actualizar etapa CARRITO:", error)
  }
}

/**
 * Avanza el lead de WhatsApp (por cookie `os_lead` o teléfono) a la etapa `CHECKOUT`.
 * Fire-and-forget: nunca lanza excepciones para no interrumpir el checkout.
 */
export async function trackLeadCheckoutStageAction(metadata?: {
  phone?: string
}): Promise<void> {
  try {
    const cookieStore = await cookies()
    const rawCookie = cookieStore.get(LEAD_COOKIE_NAME)?.value
    const leadId = verifyLeadCookieValue(rawCookie)
    const target = leadId || metadata?.phone?.trim()
    if (!target) return

    await advanceStage(target, "CHECKOUT")
  } catch (error) {
    console.error("[trackLeadCheckoutStageAction] Error al actualizar etapa CHECKOUT:", error)
  }
}
