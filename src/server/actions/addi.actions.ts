"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getSiteUrl } from "@/lib/site-url"
import {
  getAddiWidgetEvaluation,
  type AddiWidgetEvaluation,
} from "@/server/services/addi-config.service"
import { buildAddiApplication, createAddiApplication } from "@/server/services/addi-payment.service"
import { verifyGuestOrderSuccessToken } from "@/server/services/guest-order.service"
import { getOrderById } from "@/server/services/order.service"
import { updateOrderPaymentMethod } from "@/server/repositories/order.repository"

export async function getAddiWidgetEvaluationAction(
  amount: number
): Promise<AddiWidgetEvaluation | null> {
  if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
    return null
  }
  return getAddiWidgetEvaluation(amount)
}

export type StartAddiPaymentResult =
  | { success: true; redirectUrl: string }
  | { success: false; error: string }

const GENERIC_ERROR = "No pudimos conectar con Addi. Intenta de nuevo o usa otro medio de pago."

/**
 * Inicia el pago con Addi de un pedido ya creado. Solo lo puede hacer la
 * cuenta dueña del pedido o el invitado con su token firmado; los montos y
 * datos salen del pedido guardado, no del navegador.
 */
export async function startAddiPaymentAction(input: {
  orderId: string
  guestToken?: string
}): Promise<StartAddiPaymentResult> {
  const orderId = typeof input?.orderId === "string" ? input.orderId.trim() : ""
  if (!orderId) return { success: false, error: GENERIC_ERROR }

  const order = await getOrderById(orderId)
  if (!order) return { success: false, error: GENERIC_ERROR }

  const guest = verifyGuestOrderSuccessToken(input.guestToken)
  const isGuestOwner = guest?.orderId === order.id && order.userId === null
  let isAccountOwner = false
  if (!isGuestOwner && order.userId) {
    const session = await auth.api.getSession({ headers: await headers() })
    isAccountOwner = session?.user?.id === order.userId
  }
  if (!isGuestOwner && !isAccountOwner) return { success: false, error: GENERIC_ERROR }

  if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
    return { success: false, error: "Este pedido ya no está pendiente de pago." }
  }
  if ((order.customerDocumentType ?? "CC") !== "CC") {
    return { success: false, error: "Addi solo acepta cédula de ciudadanía. Usa otro medio de pago." }
  }

  const result = await createAddiApplication(
    buildAddiApplication(order, getSiteUrl(), isGuestOwner ? input.guestToken : undefined)
  )
  if (!result.ok) {
    if (result.reason === "client_has_credit") {
      return {
        success: false,
        error: "Ya tienes un crédito activo con Addi, así que este pedido no se puede pagar con Addi. Usa otro medio de pago.",
      }
    }
    return { success: false, error: GENERIC_ERROR }
  }

  await updateOrderPaymentMethod(order.id, "addi")
  return { success: true, redirectUrl: result.redirectUrl }
}
