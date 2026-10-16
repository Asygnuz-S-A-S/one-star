import { NextRequest, NextResponse } from "next/server"
import {
  parseEpaycoWebhookPayload,
  verifyEpaycoSignature,
} from "@/server/services/epayco.service"
import { applyPaymentNotification } from "@/server/services/payment.service"

/**
 * POST /api/epayco/webhook
 * ePayco envía una notificación server-to-server (confirmation_url) cada vez
 * que cambia el estado de un pago. La lógica de negocio vive en
 * payment.service; aquí solo se autentica y normaliza la petición.
 *
 * SEGURIDAD:
 * - Fail-closed: sin credenciales configuradas NO se procesa nada. Solo se
 *   permite operar sin firma en desarrollo con NEXT_PUBLIC_EPAYCO_TEST=true.
 * - El monto reportado (x_amount) debe coincidir con el total del pedido
 *   antes de marcarlo como PAID (ver payment.service).
 */
export async function POST(request: NextRequest) {
  try {
    const hasCredentials = Boolean(
      process.env.EPAYCO_CUSTOMER_ID && process.env.EPAYCO_PRIVATE_KEY
    )
    const isDevTestMode =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_EPAYCO_TEST === "true"

    if (!hasCredentials && !isDevTestMode) {
      console.error("[epayco/webhook] Credenciales de ePayco no configuradas — webhook rechazado")
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 })
    }

    const payload = parseEpaycoWebhookPayload(await request.formData())

    if (!payload.x_invoice) {
      return NextResponse.json({ error: "Missing invoice" }, { status: 400 })
    }

    if (hasCredentials && !verifyEpaycoSignature(payload)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const result = await applyPaymentNotification({
      orderId: payload.x_invoice,
      refPayco: payload.x_ref_payco,
      amount: payload.x_amount,
      codResponse: payload.x_cod_response,
    })

    if (result.outcome === "order_not_found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Siempre 200 en los demás casos para que ePayco no reintente: los
    // desenlaces que requieren revisión (monto distinto, rechazo tardío)
    // quedan registrados en el log del servicio.
    return NextResponse.json({ received: true, outcome: result.outcome })
  } catch (error) {
    console.error("[epayco/webhook]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// ePayco también puede hacer GET para verificar disponibilidad del endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" })
}
