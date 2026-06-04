"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useCart } from "@/store"
import { formatCOP } from "@/lib/shop-utils"

interface SavedItem {
  name: string
  size: string
  color: string
  price: number
  quantity: number
}

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { items, subtotal, clearCart } = useCart()

  const orderId = searchParams.get("orderId") ?? ""
  const shortId = orderId.slice(0, 8).toUpperCase()

  // Snapshot items before clearing
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [savedSubtotal, setSavedSubtotal] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!orderId) {
      router.replace("/")
      return
    }

    // Capture cart state before clearing
    setSavedItems(
      items.map((i) => ({
        name: i.name,
        size: i.size,
        color: i.color,
        price: i.price,
        quantity: i.quantity,
      }))
    )
    setSavedSubtotal(subtotal)
    setMounted(true)

    // Clear cart after a short delay so state is captured first
    const timer = setTimeout(() => {
      clearCart()
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Animated check */}
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
              .success-check-container {
                animation: circlePop 0.5s ease-out forwards;
              }
              .check-path {
                stroke-dasharray: 48;
                stroke-dashoffset: 48;
                animation: checkDraw 0.4s ease-out 0.35s forwards;
              }
            `}</style>
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
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

        {/* Heading */}
        <h1 className="font-barlow font-bold text-3xl text-[#1C1C1C] text-center mb-2">
          ¡Pedido confirmado!
        </h1>

        {/* Order ID */}
        <p className="font-montserrat text-center text-[#4A4A4A] mb-1">
          Tu número de pedido es:{" "}
          <span className="font-bold text-[#1C1C1C] tracking-wider">#{shortId}</span>
        </p>

        <p className="font-montserrat text-sm text-center text-[#4A4A4A] mb-8">
          Recibirás un email de confirmación en breve
        </p>

        {/* Order summary */}
        {savedItems.length > 0 && (
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
            <div className="flex justify-between pt-3 mt-3 border-t border-[#E0E0E0]">
              <span className="font-barlow font-bold text-[#1C1C1C]">Total pagado</span>
              <span className="font-barlow font-bold text-[#1C1C1C]">
                {formatCOP(savedSubtotal)}
              </span>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
      </div>
    </div>
  )
}
