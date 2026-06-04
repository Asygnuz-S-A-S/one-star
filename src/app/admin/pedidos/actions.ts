"use server"

import { revalidatePath } from "next/cache"
import { changeOrderStatusAndTracking } from "@/server/services/order.service"

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNumber?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await changeOrderStatusAndTracking(orderId, status, trackingNumber)
    revalidatePath(`/admin/pedidos/${orderId}`)
    revalidatePath("/admin/pedidos")
    return { success: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[updateOrderStatus]", message)
    }
    return { success: false, error: "No se pudo actualizar el pedido." }
  }
}
