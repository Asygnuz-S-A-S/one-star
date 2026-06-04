"use client"

import { useTransition } from "react"
import { markCartRecovered } from "./actions"
import { formatDate, formatCurrency } from "@/lib/dates"

interface CartData {
  id: string
  email: string
  createdAt: string
  recoveredAt: string | null
  cartValue: number
}

interface Props {
  cart: CartData
}

export default function AbandonedCartRow({ cart }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleRecover() {
    startTransition(async () => {
      await markCartRecovered(cart.id)
    })
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-[#1C1C1C]">{cart.email}</td>
      <td className="px-4 py-3 text-[#4A4A4A] whitespace-nowrap">
        {formatDate(cart.createdAt)}
      </td>
      <td className="px-4 py-3 font-semibold text-[#1C1C1C]">
        {formatCurrency(cart.cartValue)}
      </td>
      <td className="px-4 py-3">
        {cart.recoveredAt ? (
          <span className="text-green-600 text-xs font-medium">
            {formatDate(cart.recoveredAt)}
          </span>
        ) : (
          <span className="text-[#4A4A4A] text-xs">Pendiente</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {!cart.recoveredAt && (
          <button
            onClick={handleRecover}
            disabled={isPending}
            className="text-xs font-medium text-[#E31C23] hover:underline disabled:opacity-50"
          >
            {isPending ? "Guardando…" : "Marcar recuperado"}
          </button>
        )}
      </td>
    </tr>
  )
}
