import "server-only"

import { findOrdersByShortNumber } from "@/server/repositories/order.repository"
import { consumeRequestRateLimit } from "@/server/repositories/request-rate-limit.repository"
import { extractTrustedClientIp } from "@/server/services/admin-recovery.service"
import { orderTrackingUrl } from "@/server/services/order.service"

export const ORDER_NOT_FOUND_MESSAGE =
  "No encontramos un pedido con ese número y ese correo. Revisa los datos del correo de confirmación."

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000
const MAX_IP_ATTEMPTS = 10
const MAX_NUMBER_ATTEMPTS = 5
const TOO_MANY = "Demasiados intentos. Intenta de nuevo en 15 minutos."

/** Lo único que ve quien consulta sin sesión: nada de dirección, teléfono ni documento. */
export interface TrackedOrder {
  number: string
  status: string
  paymentStatus: string
  createdAt: string
  paidAt: string | null
  shippedAt: string | null
  readyForPickupAt: string | null
  deliveredAt: string | null
  /** Solo el método, para el timeline: nunca la dirección. */
  shippingAddress: { shippingMethod: string | null; pickupStoreName: string | null }
  total: number
  items: { name: string; size: string | null; quantity: number }[]
  carrier: "ENVIA" | "OTHER" | null
  trackingNumber: string | null
  trackingUrl: string | null
}

function publicShipping(raw: unknown): TrackedOrder["shippingAddress"] {
  const shipping = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {}
  const text = (key: string) => (typeof shipping[key] === "string" ? (shipping[key] as string) : null)
  return { shippingMethod: text("shippingMethod"), pickupStoreName: text("pickupStoreName") }
}

export type OrderTrackingResult =
  | { success: true; order: TrackedOrder }
  | { success: false; error: string }

/**
 * Consulta pública del estado de un pedido para compras sin cuenta. Exige el
 * número corto y el correo de la compra; si no coinciden responde siempre igual,
 * para no revelar qué pedidos existen.
 */
export async function trackOrder(
  orderNumber: string,
  email: string,
  headersList: Headers
): Promise<OrderTrackingResult> {
  const ip = extractTrustedClientIp(headersList)
  const ipRate = await consumeRequestRateLimit(`order_tracking_ip:${ip}`, RATE_LIMIT_WINDOW_MS)
  if (ipRate.count > MAX_IP_ATTEMPTS) return { success: false, error: TOO_MANY }
  const numberRate = await consumeRequestRateLimit(`order_tracking_number:${orderNumber}`, RATE_LIMIT_WINDOW_MS)
  if (numberRate.count > MAX_NUMBER_ATTEMPTS) return { success: false, error: TOO_MANY }

  const candidates = await findOrdersByShortNumber(orderNumber)
  const order = candidates.find((candidate) => {
    const orderEmail = (candidate.customerEmail ?? candidate.user?.email ?? "").trim().toLowerCase()
    return orderEmail !== "" && orderEmail === email
  })
  if (!order) return { success: false, error: ORDER_NOT_FOUND_MESSAGE }

  return {
    success: true,
    order: {
      number: order.id.slice(-8).toUpperCase(),
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      paidAt: order.paidAt?.toISOString() ?? null,
      shippedAt: order.shippedAt?.toISOString() ?? null,
      readyForPickupAt: order.readyForPickupAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      shippingAddress: publicShipping(order.shippingAddress),
      total: Number(order.total),
      items: order.items.map((item) => ({
        name: item.product.name,
        size: item.variant?.size ?? null,
        quantity: item.quantity,
      })),
      carrier: order.carrier ?? null,
      trackingNumber: order.trackingNumber,
      trackingUrl: orderTrackingUrl({ trackingNumber: order.trackingNumber, carrier: order.carrier }),
    },
  }
}
