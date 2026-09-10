"use client"

import { useRouter, usePathname } from "next/navigation"
import { DEFAULT_PRODUCT_SORT, PRODUCT_SORT_OPTIONS } from "@/lib/product-sort"

interface SortBarProps {
  total: number
  currentParams: string
}

export default function SortBar({ total, currentParams: currentParamsString }: SortBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const currentParams = new URLSearchParams(currentParamsString)

  const handleOrden = (value: string) => {
    const next = new URLSearchParams(currentParams.toString())
    next.set("orden", value)
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  const currentOrden = currentParams.get("orden") ?? DEFAULT_PRODUCT_SORT

  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#E0E0E0] dark:border-white/10">
      <p className="font-[var(--font-montserrat)] text-sm text-[#4A4A4A] dark:text-white/40">
        <span className="font-medium text-[#1C1C1C] dark:text-white/80">{total}</span>{" "}
        {total === 1 ? "producto" : "productos"}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* La etiqueta se esconde en móvil por espacio; el selector no. */}
          <label
            htmlFor="sort-select"
            className="hidden md:inline font-[var(--font-montserrat)] text-xs text-[#4A4A4A] dark:text-white/40 whitespace-nowrap"
          >
            Ordenar por:
          </label>
          <select
            id="sort-select"
            aria-label="Ordenar productos"
            value={currentOrden}
            onChange={(e) => handleOrden(e.target.value)}
            className="border border-[#E0E0E0] dark:border-white/15 text-sm font-[var(--font-montserrat)] text-[#1C1C1C] dark:text-white/80 px-3 py-1.5 focus:outline-none focus:border-[#1C1C1C] dark:focus:border-white/40 bg-white dark:bg-white/5"
          >
            {PRODUCT_SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
