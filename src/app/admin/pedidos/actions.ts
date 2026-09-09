"use server"

import { revalidatePath } from "next/cache"
import {
  cancelUnpaidOrder,
  changeOrderStatusAndTracking,
  resendOrderConfirmation,
  updateOrderCustomerData,
} from "@/server/services/order.service"
import { orderCustomerDataSchema } from "@/server/validators/order.validator"
import { isOrderStatus } from "@/lib/order-status"
import { requireAdmin } from "@/server/auth/require-admin"

interface ActionResult {
  success: boolean
  error?: string
}

function revalidateOrder(orderId: string): void {
  revalidatePath(`/admin/pedidos/${orderId}`)
  revalidatePath("/admin/pedidos")
  revalidatePath("/admin")
}

function logActionError(action: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[${action}]`, error instanceof Error ? error.message : error)
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNumber?: string
): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!isOrderStatus(status)) {
      return { success: false, error: "Estado de pedido inválido." }
    }
    await changeOrderStatusAndTracking(orderId, status, trackingNumber)
    revalidateOrder(orderId)
    return { success: true }
  } catch (error: unknown) {
    logActionError("updateOrderStatus", error)
    return { success: false, error: "No se pudo actualizar el pedido." }
  }
}

/** Cierra un pedido que nunca se pagó (el cliente no completó el pago en ePayco). */
export async function cancelUnpaidOrderAction(orderId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    await cancelUnpaidOrder(orderId)
    revalidateOrder(orderId)
    return { success: true }
  } catch (error: unknown) {
    logActionError("cancelUnpaidOrderAction", error)
    return { success: false, error: "No se pudo cancelar el pedido." }
  }
}

export async function resendOrderConfirmationAction(orderId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    await resendOrderConfirmation(orderId)
    return { success: true }
  } catch (error: unknown) {
    logActionError("resendOrderConfirmationAction", error)
    const message = error instanceof Error ? error.message : ""
    return {
      success: false,
      error: message.startsWith("Solo se puede") || message.startsWith("El pedido no tiene")
        ? message
        : "No se pudo reenviar el correo.",
    }
  }
}

export async function updateOrderCustomerDataAction(
  orderId: string,
  input: unknown
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = orderCustomerDataSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
    }
    await updateOrderCustomerData(orderId, parsed.data)
    revalidateOrder(orderId)
    return { success: true }
  } catch (error: unknown) {
    logActionError("updateOrderCustomerDataAction", error)
    return { success: false, error: "No se pudieron guardar los datos del cliente." }
  }
}
