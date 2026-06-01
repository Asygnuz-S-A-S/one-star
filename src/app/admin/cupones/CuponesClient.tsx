"use client"

import { useState, useTransition } from "react"
import CouponForm from "@/components/admin/CouponForm"
import { toggleCouponActive } from "./actions"

interface Category {
  id: string
  name: string
}

interface CouponRow {
  id: string
  code: string
  discountType: "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue: number
  minOrderAmount: number | null
  maxUses: number | null
  usedCount: number
  validUntil: string
  isActive: boolean
}

interface Props {
  coupons: CouponRow[]
  categories: Category[]
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function CuponesClient({ coupons, categories }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleCouponActive(id, current)
    })
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Cupones
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({coupons.length})</span>
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Crear cupón
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-5">
              Crear cupón
            </h2>
            <CouponForm categories={categories} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg mb-4">No hay cupones creados.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block bg-[#E31C23] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Crear primer cupón
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Código</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Tipo</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Valor</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Mín. pedido</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Usos</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Válido hasta</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.validUntil) < new Date()
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-[#1C1C1C]">
                        {coupon.code}
                      </td>
                      <td className="px-4 py-3 text-[#4A4A4A]">
                        {coupon.discountType === "PERCENTAGE" ? "Porcentaje" : "Monto fijo"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1C1C1C]">
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}%`
                          : formatCOP(coupon.discountValue)}
                      </td>
                      <td className="px-4 py-3 text-[#4A4A4A]">
                        {coupon.minOrderAmount
                          ? formatCOP(coupon.minOrderAmount)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#4A4A4A]">
                        {coupon.usedCount}
                        {coupon.maxUses ? ` / ${coupon.maxUses}` : " / ∞"}
                      </td>
                      <td className="px-4 py-3 text-[#4A4A4A] whitespace-nowrap">
                        <span className={isExpired ? "text-[#E31C23]" : ""}>
                          {new Date(coupon.validUntil).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(coupon.id, coupon.isActive)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            coupon.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {coupon.isActive ? "Activo" : "Inactivo"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
