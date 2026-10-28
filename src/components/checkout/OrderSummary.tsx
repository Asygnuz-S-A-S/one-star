"use client"

import { useState } from "react"
import Image from "next/image"
import { useCart } from "@/store"
import { formatCOP } from "@/lib/shop-utils"
import { validateCouponAction } from "@/server/actions/coupon.actions"
import { PLACEHOLDER_IMAGE_URL } from "@/lib/product-image"

export interface AppliedCoupon {
  code: string
  discountAmount: number
}

interface OrderSummaryProps {
  shippingCost: number
  appliedCoupon: AppliedCoupon | null
  onCouponChange: (coupon: AppliedCoupon | null) => void
}

export default function OrderSummary({ shippingCost, appliedCoupon, onCouponChange }: OrderSummaryProps) {
  const { items, subtotal } = useCart()
  const [isExpanded, setIsExpanded] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  const [couponApplying, setCouponApplying] = useState(false)

  const discount = appliedCoupon?.discountAmount ?? 0
  const total = subtotal - discount + shippingCost

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return
    setCouponApplying(true)
    setCouponError("")
    // El servidor valida vigencia, tope de usos, categoría y compra mínima, y
    // calcula el descuento. En placeOrder se revalida de nuevo: esto es solo
    // para la UI — por eso solo mandamos variantId+quantity, nunca precios.
    const result = await validateCouponAction(
      couponCode,
      items.map((i) => ({ variantId: i.id, quantity: i.quantity }))
    )
    if (result.valid && result.code && result.discountAmount !== undefined) {
      onCouponChange({ code: result.code, discountAmount: result.discountAmount })
      setCouponCode("")
    } else {
      setCouponError(result.error ?? "Cupón no válido")
    }
    setCouponApplying(false)
  }

  function handleRemoveCoupon() {
    onCouponChange(null)
    setCouponError("")
  }

  return (
    <div className="overflow-hidden rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white">
      {/* Mobile toggle header */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex min-h-14 w-full items-center justify-between border-b border-[#ECECEA] bg-white px-4 py-3 lg:hidden"
      >
        <span className="font-montserrat text-sm text-[#E31C23] font-medium flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {isExpanded ? "Ocultar resumen" : "Mostrar resumen del pedido"}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
        <span className="font-barlow font-bold text-[#1C1C1C]">{formatCOP(total)}</span>
      </button>

      {/* Content — always visible on desktop, toggleable on mobile */}
      <div className={`${isExpanded ? "block" : "hidden"} lg:block`}>
        <h2 className="hidden px-5 pt-5 font-barlow text-base font-bold uppercase tracking-[0.08em] text-[#1C1C1C] lg:block">Tu pedido</h2>
        {/* Items list */}
        <div className="space-y-4 border-b border-[#ECECEA] p-4 sm:p-5">
          {items.length === 0 ? (
            <p className="text-[#4A4A4A] text-sm font-montserrat text-center py-4">
              Tu bolsa está vacía
            </p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-3">
                {/* Image with quantity badge */}
                <div className="relative flex-shrink-0">
                  <div className="h-16 w-16 overflow-hidden rounded-[var(--store-radius-md)] bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_0%,#f7f7f5_55%,#ececea_100%)]">
                    <Image
                      src={item.imageUrl || PLACEHOLDER_IMAGE_URL}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="h-full w-full scale-[1.25] object-contain mix-blend-multiply"
                    />
                  </div>
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1C1C1C] px-1 font-montserrat text-[11px] font-semibold text-white">
                    {item.quantity}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-2 font-barlow text-sm font-semibold uppercase leading-tight text-[#1C1C1C]">
                    {item.name}
                  </p>
                  <p className="font-montserrat text-xs text-[#4A4A4A] mt-0.5">
                    Talla {item.size} · {item.color}
                  </p>
                </div>

                {/* Price */}
                <span className="font-montserrat text-sm font-medium text-[#1C1C1C] flex-shrink-0">
                  {formatCOP(item.price * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Coupon field */}
        <div className="border-b border-[#ECECEA] px-4 py-4 sm:px-5">
          {appliedCoupon ? (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-sm font-montserrat text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Cupón <strong>{appliedCoupon.code}</strong> aplicado
              </span>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs font-montserrat text-[#4A4A4A] underline hover:text-[#E31C23] transition-colors"
              >
                Quitar
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponError("")
                  }}
                  placeholder="Código de cupón"
                  className="min-h-12 min-w-0 flex-1 rounded-[var(--store-radius-md)] border border-[#E0E0E0] bg-white px-3.5 text-base font-montserrat text-[#1C1C1C] placeholder-[#9E9E9E] transition-colors focus:border-[#1C1C1C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponApplying || !couponCode.trim()}
                  className="min-h-12 rounded-[var(--store-radius-md)] border border-[#1C1C1C] px-5 font-montserrat text-sm font-semibold text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {couponApplying ? "..." : "Aplicar"}
                </button>
              </div>
              {couponError && (
                <p className="mt-1 text-xs text-[#E31C23] font-montserrat">{couponError}</p>
              )}
            </>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-2 p-4 sm:p-5">
          <div className="flex justify-between text-sm font-montserrat text-[#4A4A4A]">
            <span>Subtotal</span>
            <span>{formatCOP(subtotal)}</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-sm font-montserrat text-green-700">
              <span>Descuento ({appliedCoupon.code})</span>
              <span>-{formatCOP(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-montserrat text-[#4A4A4A]">
            <span>Envío</span>
            {shippingCost === 0 ? (
              <span className="text-green-600 font-medium">Gratis</span>
            ) : (
              <span>{formatCOP(shippingCost)}</span>
            )}
          </div>
          <div className="flex items-baseline justify-between border-t border-[#ECECEA] pt-3">
            <span className="font-barlow text-lg font-bold uppercase text-[#1C1C1C]">Total</span>
            <span className="font-barlow text-2xl font-bold tracking-tight text-[#1C1C1C]">{formatCOP(total)}</span>
          </div>
        </div>

        {/* Security badges */}
        <div className="px-4 pb-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#4A4A4A] font-montserrat">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pago 100% seguro con ePayco · Conexión cifrada
          </div>
        </div>
      </div>
    </div>
  )
}
