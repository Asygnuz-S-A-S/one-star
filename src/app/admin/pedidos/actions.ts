"use server"

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: OrderStatus enum in schema may differ from generated client.
// Using string cast for safety until `prisma generate` is run.
import { prisma } from "@/server/db/prisma"
import { revalidatePath } from "next/cache"

const db = prisma as any

export async function updateOrderStatus(
  orderId: string,
  status: string,
  trackingNumber?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
      },
    })
    revalidatePath(`/admin/pedidos/${orderId}`)
    revalidatePath("/admin/pedidos")
    return { success: true }
  } catch (error) {
    console.error("[updateOrderStatus]", error)
    return { success: false, error: "No se pudo actualizar el pedido." }
  }
}
