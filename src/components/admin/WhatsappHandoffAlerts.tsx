"use client"

import { useState } from "react"
import Link from "next/link"
import type { PendingHandoffDTO } from "@/server/services/lead.service"
import {
  resolveLeadHandoffAction,
  toggleLeadBotAction,
} from "@/server/actions/lead-bot.actions"

interface WhatsappHandoffAlertsProps {
  initialHandoffs: PendingHandoffDTO[]
}

export default function WhatsappHandoffAlerts({
  initialHandoffs,
}: WhatsappHandoffAlertsProps) {
  const [handoffs, setHandoffs] = useState<PendingHandoffDTO[]>(initialHandoffs)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (handoffs.length === 0) return null

  async function handleResolve(id: string) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await resolveLeadHandoffAction(id)
      if (!res.success) {
        setError(res.error ?? "No se pudo marcar como atendido.")
        return
      }
      setHandoffs((prev) => prev.filter((item) => item.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  async function handleReactivateBot(id: string) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await toggleLeadBotAction(id, false)
      if (!res.success) {
        setError(res.error ?? "No se pudo reactivar el bot.")
        return
      }
      setHandoffs((prev) => prev.filter((item) => item.id !== id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section
      aria-label="Notificaciones de WhatsApp esperando asesora"
      className="bg-white border-2 border-[#E31C23]/40 rounded-xl overflow-hidden shadow-xs"
    >
      <div className="px-5 py-3.5 bg-red-50/80 border-b border-red-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-2.5 w-2.5 rounded-full bg-[#E31C23]"
            aria-hidden="true"
          />
          <h2 className="font-barlow font-bold text-base text-[#1C1C1C]">
            WhatsApp: {handoffs.length}{" "}
            {handoffs.length === 1
              ? "cliente esperando asesora"
              : "clientes esperando asesora"}
          </h2>
        </div>

        <Link
          href="/admin/leads?needsHuman=true"
          className="text-xs font-semibold text-[#E31C23] hover:underline"
        >
          Ver todos en Leads →
        </Link>
      </div>

      {error && (
        <div className="px-5 py-2 bg-red-50 text-xs font-medium text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {handoffs.map((item) => {
          const isBusy = busyId === item.id
          return (
            <div
              key={item.id}
              className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-gray-50/60 transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-montserrat text-sm font-semibold text-[#1C1C1C]">
                    {item.name}
                  </span>
                  <span className="font-mono text-xs text-emerald-700">
                    +{item.waPhone}
                  </span>
                  {item.handoffAt && (
                    <span className="text-xs text-gray-400">
                      {new Date(item.handoffAt).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {item.handoffReason && (
                  <p className="text-xs text-[#4A4A4A] line-clamp-2">
                    “{item.handoffReason}”
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={`https://wa.me/${item.waPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  Abrir WhatsApp
                </a>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleResolve(item.id)}
                  className="inline-flex min-h-11 items-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-[#1C1C1C] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isBusy ? "…" : "Marcar atendido"}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleReactivateBot(item.id)}
                  className="inline-flex min-h-11 items-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isBusy ? "…" : "Reactivar bot"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
