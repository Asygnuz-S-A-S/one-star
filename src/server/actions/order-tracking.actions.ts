"use server"

import { headers } from "next/headers"
import { orderTrackingSchema } from "@/server/validators/order-tracking.validator"
import { trackOrder, type OrderTrackingResult } from "@/server/services/order-tracking.service"

export async function trackOrderAction(
  _previous: OrderTrackingResult | null,
  formData: FormData
): Promise<OrderTrackingResult> {
  const parsed = orderTrackingSchema.safeParse({
    orderNumber: String(formData.get("orderNumber") ?? ""),
    email: String(formData.get("email") ?? ""),
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" }
  return trackOrder(parsed.data.orderNumber, parsed.data.email, await headers())
}
