import { NextRequest, NextResponse } from "next/server"
import {
  verifyEpaycoSignature,
  EpaycoStatus,
  type EpaycoWebhookPayload,
} from "@/server/services/epayco.service"
import { changeOrderStatus } from "@/server/services/order.service"
import { updateOrderPaymentReference } from "@/server/repositories/order.repository"

/**
 * POST /api/epayco/webhook
 * ePayco envía una notificación server-to-server (confirmation_url) cada vez
 * que cambia el estado de un pago. Actualizamos el pedido según el resultado.
 */
export async function POST(request: NextRequest) {
  try {
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

    // Verificar firma cuando las credenciales están configuradas
    if (process.env.EPAYCO_CUSTOMER_ID && process.env.EPAYCO_PRIVATE_KEY) {
      if (!verifyEpaycoSignature(payload)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    const orderId = payload.x_invoice

    // Guardar referencia de ePayco para conciliación
    if (payload.x_ref_payco) {
      await updateOrderPaymentReference(orderId, payload.x_ref_payco)
    }

    switch (payload.x_cod_response) {
      case EpaycoStatus.ACCEPTED:
        await changeOrderStatus(orderId, "PAID")
        break
      case EpaycoStatus.REJECTED:
      case EpaycoStatus.FAILED:
        await changeOrderStatus(orderId, "CANCELLED")
        break
      // PENDING (3): el pedido queda en PENDING hasta confirmación posterior
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[epayco/webhook]", error)
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

// ePayco también puede hacer GET para verificar disponibilidad del endpoint
export async function GET() {
  return NextResponse.json({ status: "ok" })
}
