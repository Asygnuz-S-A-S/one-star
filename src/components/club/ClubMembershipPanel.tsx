"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { joinClubAction, leaveClubAction, setNewsletterAction } from "@/app/club/actions"
import type { ClubStatus } from "@/server/services/club.service"

interface Props {
  /** null = visitante sin sesión de cliente. */
  status: ClubStatus | null
  tone?: "dark" | "light"
}

const dateLabel = (iso: string) => new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(iso))

/** Estado y acciones de la membresía: unirse, newsletter y salir. Se usa en /club y en Mi cuenta. */
export default function ClubMembershipPanel({ status, tone = "dark" }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [newsletter, setNewsletter] = useState(status?.newsletter ?? false)
  const [error, setError] = useState("")
  const dark = tone === "dark"
  const muted = dark ? "text-white/70" : "text-[#4A4A4A]"

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError("")
    startTransition(async () => {
      const result = await action()
      if (!result.success) setError(result.error ?? "No se pudo completar. Intenta de nuevo.")
      router.refresh()
    })
  }

  if (!status) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href="/registro?club=1&callbackUrl=%2Fclub" className="inline-flex min-h-12 flex-auto items-center justify-center whitespace-nowrap rounded-[var(--store-radius-md)] bg-[#E31C23] px-6 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C01920]">
          Crear cuenta y unirme
        </Link>
        <Link href="/login?callbackUrl=%2Fclub" className={`inline-flex min-h-12 flex-auto items-center justify-center whitespace-nowrap rounded-[var(--store-radius-md)] border px-6 font-barlow text-sm font-bold uppercase tracking-widest transition-colors ${dark ? "border-white/40 text-white hover:bg-white/10" : "border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white"}`}>
          Ya tengo cuenta
        </Link>
      </div>
    )
  }

  if (!status.isMember) {
    return (
      <div className="space-y-4">
        <label className={`flex cursor-pointer items-start gap-3 font-montserrat text-sm ${muted}`}>
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#E31C23]" />
          Quiero recibir lanzamientos y novedades por correo (opcional)
        </label>
        <button type="button" disabled={pending} onClick={() => run(() => joinClubAction({ newsletter }))} className="inline-flex min-h-12 items-center justify-center rounded-[var(--store-radius-md)] bg-[#E31C23] px-6 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#C01920] disabled:opacity-60">
          {pending ? "Uniéndote…" : "Unirme gratis"}
        </button>
        {error && <p role="alert" className="font-montserrat text-xs text-[#E31C23]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className={`inline-flex items-center gap-2 font-montserrat text-sm ${dark ? "text-white" : "text-[#1C1C1C]"}`}>
        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-[#E31C23] text-xs text-white">★</span>
        Eres miembro desde el {status.joinedAt ? dateLabel(status.joinedAt) : "hoy"}
      </p>
      <label className={`flex cursor-pointer items-start gap-3 font-montserrat text-sm ${muted}`}>
        <input
          type="checkbox"
          checked={status.newsletter}
          disabled={pending}
          onChange={(e) => run(() => setNewsletterAction({ accepted: e.target.checked }))}
          className="mt-0.5 h-4 w-4 accent-[#E31C23]"
        />
        Recibir lanzamientos y novedades por correo
      </label>
      <button type="button" disabled={pending} onClick={() => run(leaveClubAction)} className={`font-montserrat text-xs underline underline-offset-4 ${muted} hover:text-[#E31C23] disabled:opacity-60`}>
        Salir del club
      </button>
      {error && <p role="alert" className="font-montserrat text-xs text-[#E31C23]">{error}</p>}
    </div>
  )
}
