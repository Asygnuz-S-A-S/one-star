import { NextResponse } from "next/server"
import { z } from "zod"
import { addiStatusToPaymentCode, verifyAddiCallbackAuth } from "@/server/services/addi-payment.service"
import { applyPaymentNotification } from "@/server/services/payment.service"

const callbackSchema = z.object({
  orderId: z.string().min(1).max(64),
  applicationId: z.string().min(1).max(128),
  approvedAmount: z.union([z.string(), z.number()]).transform(String),
  currency: z.string().optional(),
  status: z.string().min(1).max(32),
  statusTimestamp: z.union([z.string(), z.number()]).optional(),
})

/**
 * POST /api/addi/callback
 * Addi notifica el resultado de la solicitud de crédito con Basic auth
 * (credenciales de notificación del portal de aliados). Reintenta cada 30 min
 * durante 24 h hasta recibir 200 con el mismo JSON, así que debe ser
 * idempotente: applyPaymentNotification ya lo es.
 */
export async function POST(request: Request) {
  const authorized = verifyAddiCallbackAuth(request.headers.get("authorization"))
  if (authorized === null) {
    console.error("[addi/callback] Credenciales de notificación no configuradas — callback rechazado")
    return NextResponse.json({ error: "Addi not configured" }, { status: 503 })
  }
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = callbackSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  try {
    const result = await applyPaymentNotification({
      orderId: parsed.data.orderId,
      refPayco: parsed.data.applicationId,
      amount: parsed.data.approvedAmount,
      codResponse: addiStatusToPaymentCode(parsed.data.status),
    })
    if (result.outcome === "order_not_found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[addi/callback]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }

  // Addi exige de vuelta exactamente el mismo JSON.
  return NextResponse.json(raw)
}
