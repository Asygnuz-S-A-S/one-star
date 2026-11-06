"use client"

import { useActionState } from "react"
import Link from "next/link"
import { trackOrderAction } from "@/server/actions/order-tracking.actions"
import { orderStatusBadge, orderStatusLabel } from "@/lib/order-status"
import { formatCOP } from "@/lib/shop-utils"

const STATUS_HELP: Record<string, string> = {
  PENDING: "Aún no recibimos la confirmación del pago. Si ya pagaste, se actualiza en unos minutos.",
  PAID: "Tu pago está confirmado y estamos preparando el despacho.",
  SHIPPED: "Tu pedido ya salió con la transportadora.",
  DELIVERED: "Tu pedido fue entregado.",
  CANCELLED: "Este pedido se cerró sin cobro o fue cancelado.",
}

const inputClass =
  "border border-[#E0E0E0] rounded-lg px-4 py-3 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#E31C23] transition-colors"
const labelClass = "font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide"

export default function TrackOrderForm({ initialNumber }: { initialNumber: string }) {
  const [state, action, pending] = useActionState(trackOrderAction, null)
  const order = state?.success ? state.order : null

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="font-barlow font-bold text-xl tracking-wide text-[#1C1C1C] uppercase text-center">
          Rastrear mi pedido
        </h1>
        <p className="mt-3 text-center font-montserrat text-sm text-[#4A4A4A]">
          No necesitas cuenta. Usa el número de pedido y el correo de tu compra; los dos están en el correo de confirmación.
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="orderNumber" className={labelClass}>Número de pedido</label>
            <input
              id="orderNumber"
              name="orderNumber"
              required
              defaultValue={initialNumber}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="#O823F4TY"
              className={`${inputClass} uppercase`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className={labelClass}>Correo de la compra</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className={inputClass} />
          </div>
          {state && !state.success && (
            <p className="font-montserrat text-sm text-[#E31C23]" role="alert">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 w-full bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase py-3.5 rounded-lg hover:bg-[#c41920] transition-colors disabled:opacity-60"
          >
            {pending ? "Buscando..." : "Consultar pedido"}
          </button>
        </form>

        {order && (
          <section aria-live="polite" aria-label={`Pedido #${order.number}`} className="mt-8 border-t border-[#E0E0E0] pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-barlow font-bold text-lg text-[#1C1C1C]">Pedido #{order.number}</h2>
              <span className={`px-2.5 py-0.5 rounded-full font-montserrat text-xs font-medium ${orderStatusBadge(order.status)}`}>
                {orderStatusLabel(order.status)}
              </span>
            </div>
            <p className="mt-2 font-montserrat text-sm text-[#4A4A4A]">{STATUS_HELP[order.status] ?? ""}</p>
            <p className="mt-1 font-montserrat text-xs text-[#6B6B6B]">
              Hecho el {new Date(order.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
            </p>

            <ul className="mt-4 divide-y divide-[#EEEEEE]">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-3 py-2 font-montserrat text-sm text-[#1C1C1C]">
                  <span>{item.name}{item.size ? ` · talla ${item.size}` : ""}</span>
                  <span className="shrink-0 text-[#6B6B6B]">× {item.quantity}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between font-barlow font-bold text-[#1C1C1C]">
              <span>Total</span><span>{formatCOP(order.total)}</span>
            </p>

            {order.trackingNumber && (
              <div className="mt-5 rounded-lg border border-[#E0E0E0] bg-[#F9F9F9] p-4 font-montserrat text-sm text-[#1C1C1C]">
                <p><strong>Transportadora:</strong> {order.carrier === "OTHER" ? "Otra transportadora" : "Envía"}</p>
                <p className="mt-1"><strong>Número de guía:</strong> {order.trackingNumber}</p>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex font-barlow font-bold text-sm uppercase tracking-wider text-[#E31C23] hover:underline"
                  >
                    Rastrear con la transportadora
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        <p className="mt-8 text-center font-montserrat text-xs text-[#4A4A4A]">
          ¿Tienes cuenta? Revisa todos tus pedidos en{" "}
          <Link href="/cuenta" className="font-semibold text-[#E31C23] hover:underline">Mi cuenta</Link>.
        </p>
      </div>
    </main>
  )
}
