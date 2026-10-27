"use client"

import { useState } from "react"
import { formatCOP } from "@/lib/shop-utils"
import type { ClubPromotionDTO } from "@/server/services/club.service"

/** Promoción exclusiva: los miembros ven y copian el código; el resto ve que existe. */
export default function ClubPromotionCard({ promo }: { promo: ClubPromotionDTO }) {
  const [copied, setCopied] = useState(false)
  const discount = promo.discountType === "PERCENTAGE" ? `${promo.discountValue}% OFF` : `${formatCOP(promo.discountValue)} OFF`
  const until = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(promo.validUntil))

  const copy = async () => {
    if (!promo.code) return
    try {
      await navigator.clipboard.writeText(promo.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white p-6">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-[#E31C23]" />
      <div>
        <p className="store-eyebrow mb-2">Exclusivo del club</p>
        <p className="font-barlow text-4xl font-extrabold uppercase leading-none tracking-[-0.02em] text-[#1C1C1C]">{discount}</p>
        <p className="mt-2 font-montserrat text-sm text-[#4A4A4A]">
          {promo.minOrderAmount ? `En compras desde ${formatCOP(promo.minOrderAmount)}` : "En toda tu compra"} · Hasta el {until}
        </p>
      </div>
      {promo.code ? (
        <div className="flex items-center justify-between gap-3 rounded-[var(--store-radius-md)] border border-dashed border-[#1C1C1C]/30 bg-[#F2F2F0] py-2 pl-4 pr-2">
          <span className="font-mono text-base font-semibold tracking-[0.12em] text-[#1C1C1C]">{promo.code}</span>
          <button type="button" onClick={copy} className="min-h-10 rounded-[var(--store-radius-sm)] bg-[#1C1C1C] px-4 font-barlow text-xs font-bold uppercase tracking-widest text-white hover:bg-[#333]">
            {copied ? "Copiado" : "Copiar"}
          </button>
          <span className="sr-only" aria-live="polite">{copied ? "Código copiado" : ""}</span>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-[var(--store-radius-md)] bg-[#F2F2F0] px-4 py-3 font-montserrat text-sm text-[#4A4A4A]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          Únete al club para ver el código
        </p>
      )}
    </article>
  )
}
