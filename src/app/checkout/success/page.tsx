"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/store"
import { formatCOP } from "@/lib/shop-utils"
import { buildMetaCommerceParams, trackMetaEvent } from "@/lib/tracking/meta-pixel"
import { checkPaymentStatus, type PaymentStatusResult } from "./actions"

interface SavedItem {
  name: string
  size: string
  color: string
  price: number
  quantity: number
}

type ViewState =
  | { kind: "loading" }
  | { kind: "result"; result: PaymentStatusResult }

/**
 * ePayco redirige a la URL de respuesta añadiendo `ref_payco`. Si concatenó
 * mal sobre nuestro `?orderId=`, el id llega como "abc?ref_payco=xyz"; se
 * separa aquí para no depender de cómo arme la URL la pasarela.
 */
function readParams(search: URLSearchParams): { orderId: string; refPayco: string } {
  const rawOrderId = search.get("orderId") ?? ""
  const [orderId, tail = ""] = rawOrderId.split("?")
  const refFromTail = new URLSearchParams(tail).get("ref_payco") ?? ""
  return { orderId, refPayco: search.get("ref_payco") ?? refFromTail }
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const { items, clearCart } = useCart()

  const [view, setView] = useState<ViewState>({ kind: "loading" })
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const hasTrackedPurchase = useRef(false)
  const hasVerified = useRef(false)

  useEffect(() => {
    if (hasVerified.current) return
    hasVerified.current = true

    const { orderId, refPayco } = readParams(searchParams)
    // Snapshot del carrito antes de vaciarlo: se muestra en el resumen.
    setSavedItems(
      items.map((i) => ({
        name: i.name,
        size: i.size,
        color: i.color,
        price: i.price,
        quantity: i.quantity,
      }))
    )

    let cancelled = false
    checkPaymentStatus({ refPayco, orderId })
      .catch((): PaymentStatusResult => ({ status: "unknown", orderId: orderId || null, total: null }))
      .then((result) => {
        if (cancelled) return
        setView({ kind: "result", result })

        // Solo un pago aprobado o en proceso cierra la compra: si fue
        // rechazado el carrito se conserva para reintentar.
        if (result.status === "approved" || result.status === "pending") {
          clearCart()
        }
        // Purchase del navegador solo con pago aprobado. Comparte event_id
        // (= id del pedido) con el que envía el servidor; Meta deduplica.
        if (result.status === "approved" && result.orderId && items.length > 0 && !hasTrackedPurchase.current) {
          hasTrackedPurchase.current = true
          trackMetaEvent("Purchase", buildMetaCommerceParams(items), { eventId: result.orderId })
        }
      })

    return () => {
      cancelled = true
    }
    // Se ejecuta una sola vez por montaje de la página de respuesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (view.kind === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
        <p className="font-montserrat text-sm text-[#4A4A4A]" role="status">
          Verificando el estado de tu pago…
        </p>
      </div>
    )
  }

  const { result } = view
  const shortId = result.orderId ? result.orderId.slice(-8).toUpperCase() : null
  const copy = COPY[result.status]

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <StatusIcon status={result.status} />

        <h1 className="font-barlow font-bold text-3xl text-[#1C1C1C] text-center mb-2">
          {copy.title}
        </h1>

        {shortId && (
          <p className="font-montserrat text-center text-[#4A4A4A] mb-1">
            Tu número de pedido es:{" "}
            <span className="font-bold text-[#1C1C1C] tracking-wider">#{shortId}</span>
          </p>
        )}

        <p className="font-montserrat text-sm text-center text-[#4A4A4A] mb-8">
          {copy.description}
        </p>

        {result.status !== "rejected" && savedItems.length > 0 && (
          <div className="bg-[#F5F5F5] rounded-lg p-4 mb-8">
            <h2 className="font-barlow font-bold text-[#1C1C1C] mb-3 text-sm uppercase tracking-wide">
              Resumen de tu pedido
            </h2>
            <div className="space-y-2">
              {savedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm font-montserrat">
                  <span className="text-[#1C1C1C]">
                    {item.name}{" "}
                    <span className="text-[#4A4A4A] text-xs">
                      (T.{item.size} · {item.color} × {item.quantity})
                    </span>
                  </span>
                  <span className="text-[#1C1C1C] font-medium">
                    {formatCOP(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            {result.total !== null && (
              <div className="flex justify-between pt-3 mt-3 border-t border-[#E0E0E0]">
                <span className="font-barlow font-bold text-[#1C1C1C]">
                  {result.status === "approved" ? "Total pagado" : "Total del pedido"}
                </span>
                <span className="font-barlow font-bold text-[#1C1C1C]">
                  {formatCOP(result.total)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {result.status === "rejected" ? (
            <>
              <Link
                href="/checkout"
                className="flex-1 text-center bg-[#E31C23] text-white font-montserrat font-medium py-3 px-6 rounded hover:bg-[#c21920] transition-colors text-sm"
              >
                Intentar el pago de nuevo
              </Link>
              <Link
                href="/productos"
                className="flex-1 text-center border border-[#1C1C1C] text-[#1C1C1C] font-montserrat font-medium py-3 px-6 rounded hover:bg-[#1C1C1C] hover:text-white transition-colors text-sm"
              >
                Seguir comprando
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/productos"
                className="flex-1 text-center border border-[#1C1C1C] text-[#1C1C1C] font-montserrat font-medium py-3 px-6 rounded hover:bg-[#1C1C1C] hover:text-white transition-colors text-sm"
              >
                Seguir comprando
              </Link>
              <Link
                href="/cuenta/pedidos"
                className="flex-1 text-center bg-[#E31C23] text-white font-montserrat font-medium py-3 px-6 rounded hover:bg-[#c21920] transition-colors text-sm"
              >
                Ver mis pedidos
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const COPY: Record<PaymentStatusResult["status"], { title: string; description: string }> = {
  approved: {
    title: "¡Pedido confirmado!",
    description: "Tu pago fue aprobado. Recibirás un email de confirmación en breve.",
  },
  pending: {
    title: "Pago en proceso",
    description:
      "Tu pedido quedó registrado y estamos esperando la confirmación de la entidad de pago. Te avisaremos por correo apenas se apruebe.",
  },
  rejected: {
    title: "El pago no se completó",
    description:
      "La pasarela no aprobó el pago y el pedido quedó sin efecto. Tu carrito sigue intacto para que lo intentes de nuevo.",
  },
  unknown: {
    title: "No pudimos verificar tu pago",
    description:
      "Si el cobro se realizó, el pedido se actualizará automáticamente en unos minutos. Puedes revisarlo en \"Mis pedidos\".",
  },
}

function StatusIcon({ status }: { status: PaymentStatusResult["status"] }) {
  if (status === "approved") {
    return (
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center success-check-container">
          <style>{`
            @keyframes checkDraw {
              from { stroke-dashoffset: 48; }
              to   { stroke-dashoffset: 0; }
            }
            @keyframes circlePop {
              0%   { transform: scale(0.6); opacity: 0; }
              70%  { transform: scale(1.1); }
              100% { transform: scale(1); opacity: 1; }
            }
            .success-check-container { animation: circlePop 0.5s ease-out forwards; }
            .check-path {
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: checkDraw 0.4s ease-out 0.35s forwards;
            }
          `}</style>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              className="check-path"
              d="M8 20l8 8 16-16"
              stroke="#16a34a"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    )
  }

  const palette =
    status === "rejected"
      ? { bg: "bg-red-100", stroke: "#E31C23" }
      : { bg: "bg-yellow-100", stroke: "#b45309" }

  return (
    <div className="flex justify-center mb-8">
      <div className={`w-20 h-20 rounded-full ${palette.bg} flex items-center justify-center`}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke={palette.stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          {status === "rejected" ? (
            <>
              <path d="M12 12l16 16" />
              <path d="M28 12L12 28" />
            </>
          ) : (
            <>
              <circle cx="20" cy="20" r="13" />
              <path d="M20 12v8l5 3" />
            </>
          )}
        </svg>
      </div>
    </div>
  )
}
