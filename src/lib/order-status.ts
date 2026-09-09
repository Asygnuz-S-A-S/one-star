/**
 * Etiquetas y estilos compartidos para el estado logístico del pedido y el
 * estado del pago. Se importa tanto desde Server Components como desde
 * componentes cliente, por eso no lleva `server-only`.
 *
 * Los valores replican los enums `OrderStatus` y `PaymentStatus` de Prisma
 * como literales para no arrastrar `@prisma/client` al bundle del navegador.
 */

export const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const
export type OrderStatusValue = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED", "FAILED", "EXPIRED"] as const
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number]

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  PENDING: "Pago pendiente",
  PAID: "Pagado · por despachar",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
}

export const ORDER_STATUS_BADGE: Record<OrderStatusValue, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-blue-100 text-blue-700",
  SHIPPED: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-[#E31C23]",
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  PENDING: "Sin confirmar",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  FAILED: "Fallido",
  EXPIRED: "Vencido sin pago",
}

export const PAYMENT_STATUS_BADGE: Record<PaymentStatusValue, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-[#E31C23]",
  FAILED: "bg-red-100 text-[#E31C23]",
  EXPIRED: "bg-gray-200 text-gray-700",
}

export function isOrderStatus(value: string): value is OrderStatusValue {
  return (ORDER_STATUSES as readonly string[]).includes(value)
}

export function orderStatusLabel(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status
}

export function orderStatusBadge(status: string): string {
  return isOrderStatus(status) ? ORDER_STATUS_BADGE[status] : "bg-gray-100 text-gray-600"
}

export function paymentStatusLabel(status: string): string {
  return (PAYMENT_STATUSES as readonly string[]).includes(status)
    ? PAYMENT_STATUS_LABELS[status as PaymentStatusValue]
    : status
}

export function paymentStatusBadge(status: string): string {
  return (PAYMENT_STATUSES as readonly string[]).includes(status)
    ? PAYMENT_STATUS_BADGE[status as PaymentStatusValue]
    : "bg-gray-100 text-gray-600"
}

/** Un pedido es una venta real solo cuando la pasarela confirmó el pago. */
export function isPaidOrder(paymentStatus: string): boolean {
  return paymentStatus === "APPROVED"
}
