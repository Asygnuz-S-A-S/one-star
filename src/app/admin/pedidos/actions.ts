"use server"

import { revalidatePath } from "next/cache"
import { changeOrderStatusAndTracking } from "@/server/services/order.service"
import { requireAdmin } from "@/server/auth/require-admin"

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNumber?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await changeOrderStatusAndTracking(orderId, status, trackingNumber)
    revalidatePath(`/admin/pedidos/${orderId}`)
    revalidatePath("/admin/pedidos")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    if (process.env.NODE_ENV === "development") {
      console.error("[updateOrderStatus]", message)
    }
    return { success: false, error: "No se pudo actualizar el pedido." }
  }
}
