import { NextRequest, NextResponse } from "next/server"
import {
  verifyEpaycoSignature,
  EpaycoStatus,
  type EpaycoWebhookPayload,
} from "@/server/services/epayco.service"
import { changeOrderStatus, getOrderById } from "@/server/services/order.service"
import { updateOrderPaymentReference } from "@/server/repositories/order.repository"

/** Tolerancia para comparar montos (centavos por redondeo de la pasarela) */
const AMOUNT_TOLERANCE = 0.01

/**
 * POST /api/epayco/webhook
 * ePayco envía una notificación server-to-server (confirmation_url) cada vez
 * que cambia el estado de un pago. Actualizamos el pedido según el resultado.
 *
 * SEGURIDAD:
 * - Fail-closed: sin credenciales configuradas NO se procesa nada. Solo se
 *   permite operar sin firma en desarrollo con NEXT_PUBLIC_EPAYCO_TEST=true.
 * - El monto reportado (x_amount) debe coincidir con el total del pedido
 *   antes de marcarlo como PAID.
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

    const formData = await request.formData()

    const payload: EpaycoWebhookPayload = {
      x_ref_payco: String(formData.get("x_ref_payco") ?? ""),
      x_transaction_id: String(formData.get("x_transaction_id") ?? ""),
      x_amount: String(formData.get("x_amount") ?? ""),
      x_currency_code: String(formData.get("x_currency_code") ?? ""),
      x_cod_response: String(formData.get("x_cod_response") ?? ""),
      x_transaction_state: String(formData.get("x_transaction_state") ?? ""),
      x_invoice: String(formData.get("x_invoice") ?? ""),
      x_signature: String(formData.get("x_signature") ?? ""),
    }

    if (!payload.x_invoice) {
      return NextResponse.json({ error: "Missing invoice" }, { status: 400 })
    }

    if (hasCredentials && !verifyEpaycoSignature(payload)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const orderId = payload.x_invoice

    const order = await getOrderById(orderId)
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Guardar referencia de ePayco para conciliación
    if (payload.x_ref_payco) {
      await updateOrderPaymentReference(orderId, payload.x_ref_payco)
    }

    switch (payload.x_cod_response) {
      case EpaycoStatus.ACCEPTED: {
        // Idempotencia: si ya está pagado no se reprocesa (evita doble descuento de stock)
        if (order.status === "PAID") {
          return NextResponse.json({ received: true, alreadyPaid: true })
        }
        // El monto pagado debe coincidir con el total del pedido
        const paidAmount = Number.parseFloat(payload.x_amount)
        if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - order.total) > AMOUNT_TOLERANCE) {
          console.error(
            `[epayco/webhook] Monto no coincide para pedido ${orderId}: pagado=${payload.x_amount}, esperado=${order.total}`
          )
          // 200 para que ePayco no reintente; el pedido queda PENDING para revisión manual
          return NextResponse.json({ received: true, amountMismatch: true })
        }
        await changeOrderStatus(orderId, "PAID")
        break
      }
      case EpaycoStatus.REJECTED:
      case EpaycoStatus.FAILED:
        await changeOrderStatus(orderId, "CANCELLED")
        break
      // PENDING (3): el pedido queda en PENDING hasta confirmación posterior
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[epayco/webhook]", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// ePayco también puede hacer GET para verificar disponibilidad del endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" })
}
