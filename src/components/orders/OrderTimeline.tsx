import { isPickupShipping } from "@/lib/order-status"

export interface OrderTimelineData {
  status: string
  shippingAddress?: unknown
  createdAt: string
  paidAt?: string | null
  shippedAt?: string | null
  readyForPickupAt?: string | null
  deliveredAt?: string | null
}

interface Step {
  label: string
  done: boolean
  at: string | null
  hint?: string
}

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Bogota",
})

const ORDER_OF_STATUS: Record<string, number> = { PENDING: 0, PAID: 1, SHIPPED: 2, DELIVERED: 3 }

/** Pasos del pedido con su fecha; los que aún no pasan van en gris. Pedidos viejos pueden no tener la hora de cada paso. */
export function buildOrderTimeline(order: OrderTimelineData): Step[] {
  const pickup = isPickupShipping(order.shippingAddress)
  const reached = ORDER_OF_STATUS[order.status] ?? 0
  const steps: Step[] = [
    { label: "Pedido recibido", done: true, at: order.createdAt },
    { label: "Pago confirmado", done: reached >= 1 || Boolean(order.paidAt), at: order.paidAt ?? null },
    pickup
      ? { label: "Listo para recoger", done: reached >= 2, at: order.readyForPickupAt ?? null, hint: "Te avisamos por correo cuando puedas pasar por él." }
      : { label: "Enviado", done: reached >= 2, at: order.shippedAt ?? null, hint: "Sale con la transportadora y te llega la guía por correo." },
    { label: pickup ? "Recogido en tienda" : "Entregado", done: reached >= 3, at: order.deliveredAt ?? null },
  ]
  if (order.status === "CANCELLED") {
    return [...steps.filter((step) => step.done), { label: "Cancelado", done: true, at: null }]
  }
  return steps
}

export default function OrderTimeline({ order }: { order: OrderTimelineData }) {
  const steps = buildOrderTimeline(order)
  const current = steps.findIndex((step) => !step.done)

  return (
    <ol aria-label="Recorrido del pedido" className="relative ml-2 border-l-2 border-[#E0E0E0]">
      {steps.map((step, index) => {
        const cancelled = step.label === "Cancelado"
        const dot = cancelled ? "bg-[#E31C23]" : step.done ? "bg-[#1C1C1C]" : "bg-white border-2 border-[#C8C8C8]"
        return (
          <li key={step.label} className="relative pb-5 pl-6 last:pb-0" aria-current={index === current ? "step" : undefined}>
            <span aria-hidden="true" className={`absolute -left-[9px] top-0.5 h-4 w-4 rounded-full ${dot}`} />
            <p className={`font-montserrat text-sm font-semibold ${step.done ? "text-[#1C1C1C]" : "text-[#8A8A8A]"}`}>
              {step.label}
              {!step.done && index === current && <span className="ml-2 font-normal text-xs text-[#6B6B6B]">· Siguiente paso</span>}
            </p>
            {step.done && !cancelled && (
              <p className="font-montserrat text-xs text-[#6B6B6B]">
                {step.at ? DATE_FORMAT.format(new Date(step.at)) : "Fecha no registrada"}
              </p>
            )}
            {!step.done && step.hint && <p className="font-montserrat text-xs text-[#8A8A8A]">{step.hint}</p>}
          </li>
        )
      })}
    </ol>
  )
}
