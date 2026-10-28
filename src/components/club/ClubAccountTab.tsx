"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { getMyClubStatusAction } from "@/app/club/actions"
import ClubMembershipPanel from "@/components/club/ClubMembershipPanel"
import type { ClubStatus } from "@/server/services/club.service"

/** Pestaña "One Star Club" de Mi cuenta: estado de la membresía y acceso a las promociones. */
export default function ClubAccountTab() {
  const [status, setStatus] = useState<ClubStatus | null | undefined>(undefined)

  useEffect(() => {
    void getMyClubStatusAction().then(setStatus)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#1C1C1C] p-6 text-white sm:p-8">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-10 select-none font-barlow text-[12rem] font-black leading-none text-white/[0.05]">★</span>
      <p className="store-eyebrow mb-2">Comunidad One Star</p>
      <h2 className="font-barlow text-3xl font-extrabold uppercase tracking-[-0.02em]">One Star Club</h2>
      <p className="mt-2 max-w-md font-montserrat text-sm text-white/70">
        Promociones exclusivas para miembros y, si quieres, lanzamientos y novedades en tu correo.
      </p>
      <div className="mt-6">
        {status === undefined ? (
          <p className="font-montserrat text-sm text-white/60">Cargando…</p>
        ) : (
          <ClubMembershipPanel status={status} />
        )}
      </div>
      {status?.isMember && (
        <Link href="/club" className="mt-6 inline-flex min-h-11 items-center gap-2 font-barlow text-sm font-bold uppercase tracking-widest text-white underline-offset-8 hover:underline">
          Ver promociones del club →
        </Link>
      )}
    </div>
  )
}
