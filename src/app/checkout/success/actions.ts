"use server"

import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { confirmPaymentByReference, type ReferencePaymentStatus } from "@/server/services/payment.service"
import { getOrderById, type OrderDTO } from "@/server/services/order.service"
import { verifyGuestOrderSuccessToken } from "@/server/services/guest-order.service"

export interface PaymentStatusResult {
  status: ReferencePaymentStatus
  orderId: string | null
  total: number | null
}

const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/
const UNKNOWN: PaymentStatusResult = { status: "unknown", orderId: null, total: null }

function statusFromPaymentStatus(paymentStatus: string): ReferencePaymentStatus {
  if (paymentStatus === "APPROVED") return "approved"
  if (paymentStatus === "REJECTED" || paymentStatus === "FAILED" || paymentStatus === "EXPIRED") {
    return "rejected"
  }
  return "pending"
}

/**
 * El pedido solo se muestra a la cuenta que lo creó (sesión activa)
 * o al invitado que presente un token firmado y vigente.
 */
async function canViewOrder(
  order: Pick<OrderDTO, "userId" | "id">,
  guestVerifiedOrderId?: string
): Promise<boolean> {
  if (guestVerifiedOrderId && order.id === guestVerifiedOrderId) {
    return true
  }
  const session = await auth.api.getSession({ headers: await headers() })
  const userId = session?.user?.id
  return Boolean(userId) && order.userId === userId
}

/**
 * Estado del pago para la página de respuesta de ePayco. Con `refPayco`
 * consulta a ePayco y aplica el resultado al pedido (mismo flujo que el
 * webhook); sin él, o si la consulta no responde, cae al estado guardado.
 * Los datos del pedido solo se devuelven a su dueño o a quien posea el token firmado.
 */
export async function checkPaymentStatus(params: {
  refPayco?: string | null
  orderId?: string | null
  token?: string | null
}): Promise<PaymentStatusResult> {
  const refPayco = params.refPayco?.trim() ?? ""
  const orderId = params.orderId?.trim() ?? ""
  const rawToken = params.token?.trim() ?? ""

  // Si viene token firmado de invitado, lo validamos primero
  const verifiedGuest = rawToken ? verifyGuestOrderSuccessToken(rawToken) : null
  const guestOrderId = verifiedGuest?.orderId

  const hasRef = ID_PATTERN.test(refPayco)
  const hasOrderId = ID_PATTERN.test(orderId)

  // Aplicar el resultado real de ePayco es correcto venga de quien venga (la
  // fuente es el servidor de ePayco); lo que se protege es la lectura.
  let confirmedOrderId: string | null = null
  const lookupId = guestOrderId ?? (hasOrderId ? orderId : undefined)

  if (hasRef) {
    const result = await confirmPaymentByReference(refPayco, lookupId)
    if (result.status !== "unknown" && result.order) confirmedOrderId = result.order.id
  }

  const targetId = confirmedOrderId ?? guestOrderId ?? (hasOrderId ? orderId : null)
  if (!targetId) return UNKNOWN

  const order = await getOrderById(targetId)
  if (!order || !(await canViewOrder(order, guestOrderId))) {
    return { ...UNKNOWN, orderId: guestOrderId ?? (hasOrderId ? orderId : null) }
  }

  return {
    status: statusFromPaymentStatus(order.paymentStatus),
    orderId: order.id,
    total: order.total,
  }
}
