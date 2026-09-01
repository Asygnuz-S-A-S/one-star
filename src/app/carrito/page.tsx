"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useCart } from "@/store"
import { formatCOP } from "@/lib/shop-utils"
import { applyCoupon, type ApplyCouponResult } from "./actions"

const FREE_SHIPPING_THRESHOLD = 200_000
const SHIPPING_COST = 15_000

function IconX({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="4" x2="16" y2="16" />
      <line x1="16" y1="4" x2="4" y2="16" />
    </svg>
  )
}

function IconCartEmpty() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 64 64"
      fill="none"
      stroke="#E0E0E0"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 8L12 20v36a4 4 0 004 4h32a4 4 0 004-4V20l-8-12z" />
      <line x1="12" y1="20" x2="52" y2="20" />
      <path d="M40 28a8 8 0 01-16 0" />
    </svg>
  )
}

export default function CarritoPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart()
  const router = useRouter()
  const [couponCode, setCouponCode] = useState("")
  const [couponResult, setCouponResult] = useState<ApplyCouponResult | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const discount = couponResult?.valid
    ? couponResult.discountType === "PERCENTAGE"
      ? Math.round((subtotal * couponResult.discountValue!) / 100)
      : Math.min(couponResult.discountValue!, subtotal)
    : 0

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const total = subtotal + shipping - discount

  async function handleApplyCoupon() {
    setCouponLoading(true)
    const result = await applyCoupon(couponCode, subtotal)
    setCouponResult(result)
    setCouponLoading(false)
  }

  function handleRemoveCoupon() {
    setCouponCode("")
    setCouponResult(null)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-6 text-center">
        <IconCartEmpty />
        <h1 className="font-barlow font-bold text-2xl text-[#1C1C1C] uppercase tracking-wide">
          Tu carrito está vacío
        </h1>
        <p className="font-montserrat text-sm text-[#4A4A4A] max-w-xs">
          Explora nuestra colección y encuentra el par perfecto.
        </p>
        <Link
          href="/productos"
          className="mt-2 bg-[#E31C23] text-white font-barlow font-bold uppercase tracking-widest text-sm px-8 py-4 hover:bg-[#C01920] transition-colors"
        >
          Explorar productos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-barlow font-bold text-2xl md:text-3xl text-[#1C1C1C] uppercase tracking-wide mb-8">
        Mi Carrito
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Items list — 60% */}
        <div className="lg:col-span-3 flex flex-col divide-y divide-[#E0E0E0] border-t border-[#E0E0E0]">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 py-6">
              {/* Image */}
              <div className="relative w-24 h-24 md:w-28 md:h-28 bg-[#E0E0E0] shrink-0">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 96px, 112px"
                  />
                ) : (
                  <div className="w-full h-full bg-[#E0E0E0]" />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col flex-1 min-w-0 gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {item.brand && (
                      <p className="font-montserrat text-xs text-[#4A4A4A] uppercase tracking-widest mb-0.5">
                        {item.brand}
                      </p>
                    )}
                    <p className="font-barlow font-semibold text-base text-[#1C1C1C] leading-snug">
                      {item.name}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    aria-label={`Eliminar ${item.name}`}
                    className="text-[#4A4A4A] hover:text-[#E31C23] transition-colors shrink-0 p-1"
                  >
                    <IconX />
                  </button>
                </div>

                {item.kind === "gift_card" ? (
                  <p className="font-montserrat text-sm text-[#4A4A4A]">
                    Entrega digital · Vigencia de 12 meses
                  </p>
                ) : (
                  <p className="font-montserrat text-sm text-[#4A4A4A]">
                    Talla: <span className="font-medium text-[#1C1C1C]">{item.size}</span>
                    &nbsp;·&nbsp;
                    Color: <span className="font-medium text-[#1C1C1C] capitalize">{item.color}</span>
                  </p>
                )}

                <p className="font-montserrat text-xs text-[#4A4A4A]">SKU: {item.sku}</p>

                <div className="flex items-center justify-between mt-auto pt-2">
                  {/* Quantity controls */}
                  <div className="flex items-center border border-[#E0E0E0]">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Reducir cantidad"
                      className="w-9 h-9 flex items-center justify-center text-[#1C1C1C] hover:bg-[#E0E0E0] transition-colors font-montserrat"
                    >
                      −
                    </button>
                    <span className="w-9 h-9 flex items-center justify-center font-montserrat text-sm text-[#1C1C1C] border-x border-[#E0E0E0]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Aumentar cantidad"
                      className="w-9 h-9 flex items-center justify-center text-[#1C1C1C] hover:bg-[#E0E0E0] transition-colors font-montserrat"
                    >
                      +
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <p className="font-barlow font-bold text-lg text-[#1C1C1C]">
                      {formatCOP(item.price * item.quantity)}
                    </p>
                    {item.price !== item.originalPrice && (
                      <p className="font-montserrat text-xs text-[#4A4A4A] line-through">
                        {formatCOP(item.originalPrice * item.quantity)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4">
            <button
              onClick={clearCart}
              className="font-montserrat text-sm text-[#4A4A4A] underline hover:text-[#E31C23] transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        </div>

        {/* Order summary — 40% */}
        <div className="lg:col-span-2">
          <div className="border border-[#E0E0E0] bg-white p-6 flex flex-col gap-5 sticky top-28">
            <h2 className="font-barlow font-bold text-lg uppercase tracking-wide text-[#1C1C1C]">
              Resumen del pedido
            </h2>

            <div className="flex flex-col gap-3 text-sm font-montserrat">
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Subtotal</span>
                <span className="font-medium text-[#1C1C1C]">{formatCOP(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Descuento ({couponResult!.code})</span>
                  <span className="font-medium text-green-600">−{formatCOP(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#4A4A4A]">Envío</span>
                <span className="font-medium text-[#1C1C1C]">
                  {shipping === 0 ? (
                    <span className="text-green-600">Gratis</span>
                  ) : (
                    formatCOP(shipping)
                  )}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-[#4A4A4A]">
                  Envío gratis en compras mayores a {formatCOP(FREE_SHIPPING_THRESHOLD)}
                </p>
              )}
            </div>

            <div className="border-t border-[#E0E0E0] pt-3 flex justify-between items-center">
              <span className="font-barlow font-bold text-base text-[#1C1C1C]">Total</span>
              <span className="font-barlow font-bold text-xl text-[#1C1C1C]">
                {formatCOP(total)}
              </span>
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="w-full bg-[#E31C23] text-white font-barlow font-bold uppercase tracking-widest text-sm py-4 hover:bg-[#C01920] transition-colors"
            >
              Proceder al checkout
            </button>

            <Link
              href="/productos"
              className="block w-full text-center border border-[#1C1C1C] text-[#1C1C1C] font-barlow font-bold uppercase tracking-widest text-sm py-3 hover:bg-[#1C1C1C] hover:text-white transition-colors"
            >
              Seguir comprando
            </Link>

            {/* Coupon */}
            <div className="border-t border-[#E0E0E0] pt-4">
              <p className="font-barlow font-semibold text-sm uppercase tracking-wide text-[#1C1C1C] mb-3">
                ¿Tienes un cupón?
              </p>
              {couponResult?.valid ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-2">
                  <span className="font-montserrat text-sm text-green-700 font-medium">
                    ✓ {couponResult.code} aplicado
                  </span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="font-montserrat text-xs text-[#4A4A4A] underline hover:text-[#E31C23] ml-2"
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
                        setCouponCode(e.target.value)
                        if (couponResult) setCouponResult(null)
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="Código de descuento"
                      className="flex-1 border border-[#E0E0E0] px-3 py-2 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#4A4A4A] focus:outline-none focus:border-[#1C1C1C]"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="bg-[#1C1C1C] text-white font-barlow font-bold text-sm uppercase px-4 py-2 hover:bg-[#333] transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? "..." : "Aplicar"}
                    </button>
                  </div>
                  {couponResult && !couponResult.valid && (
                    <p className="mt-1.5 font-montserrat text-xs text-[#E31C23]">
                      {couponResult.error}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Payment methods */}
            <div className="border-t border-[#E0E0E0] pt-4">
              <p className="font-montserrat text-xs text-[#4A4A4A] mb-2">Métodos de pago aceptados:</p>
              <div className="flex gap-3 flex-wrap">
                {["ePayco", "Mercadopago", "Addi"].map((method) => (
                  <span
                    key={method}
                    className="border border-[#E0E0E0] font-montserrat text-xs text-[#4A4A4A] px-3 py-1.5"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
