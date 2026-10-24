import type { Metadata } from "next"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import ClubMembershipPanel from "@/components/club/ClubMembershipPanel"
import ClubPromotionCard from "@/components/club/ClubPromotionCard"
import { getClubPromotions, getClubStatus } from "@/server/services/club.service"
import { getClubCopy } from "@/server/services/store-settings.service"
import { DEFAULT_CLUB_BENEFITS, DEFAULT_CLUB_HEADLINE, DEFAULT_CLUB_INTRO } from "@/lib/storefront-copy"

export const metadata: Metadata = {
  title: "One Star Club | One Star",
  description: "Únete gratis a One Star Club y accede a promociones exclusivas para miembros.",
}

export const dynamic = "force-dynamic"

export default async function ClubPage() {
  const copy = await getClubCopy().catch(() => ({
    headline: DEFAULT_CLUB_HEADLINE,
    intro: DEFAULT_CLUB_INTRO,
    benefits: DEFAULT_CLUB_BENEFITS,
    welcomeSubject: "",
    welcomeBody: "",
  }))
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user as { id?: string; userType?: string } | undefined
  const status = user?.id && user.userType === "customer" ? await getClubStatus(user.id) : null
  const promotions = await getClubPromotions(Boolean(status?.isMember))

  return (
    <div>
      {/* Portada del club: carbón con acento rojo, como el resto del sistema visual. */}
      <section className="relative overflow-hidden bg-[#1C1C1C] text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 select-none font-barlow text-[20rem] font-black leading-none text-white/[0.04] md:text-[28rem]">★</span>
        <div className="store-gutter store-section relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="store-eyebrow mb-4">Comunidad One Star</p>
            <h1 className="font-barlow text-5xl font-extrabold uppercase leading-[0.9] tracking-[-0.03em] sm:text-7xl">{copy.headline}</h1>
            <span aria-hidden="true" className="mt-4 block h-1 w-14 bg-[#E31C23]" />
            <p className="mt-5 max-w-xl font-montserrat text-base text-white/75 md:text-lg">
              {copy.intro}
            </p>
          </div>
          <div className="rounded-[var(--store-radius-xl)] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <p className="mb-4 font-barlow text-lg font-bold uppercase tracking-[0.06em]">
              {status?.isMember ? "Tu membresía" : "Únete al club"}
            </p>
            <ClubMembershipPanel status={status} />
          </div>
        </div>
      </section>

      <section className="store-gutter store-section mx-auto max-w-6xl">
        <ul className="grid gap-4 sm:grid-cols-3">
          {copy.benefits.map((benefit, index) => (
            <li key={benefit.title} className="rounded-[var(--store-radius-lg)] border border-[#ECECEA] bg-white p-6">
              <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-[#1C1C1C] font-barlow text-sm font-bold text-white">{index + 1}</span>
              <h2 className="mt-4 font-barlow text-xl font-bold uppercase tracking-[0.02em] text-[#1C1C1C]">{benefit.title}</h2>
              <p className="mt-2 font-montserrat text-sm text-[#4A4A4A]">{benefit.detail}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="store-heading">Promociones del club</h2>
              <span aria-hidden="true" className="mt-3 block h-1 w-12 bg-[#E31C23]" />
            </div>
            {!status?.isMember && promotions.length > 0 && (
              <p className="font-montserrat text-sm text-[#4A4A4A]">Únete para desbloquear los códigos.</p>
            )}
          </div>
          {promotions.length === 0 ? (
            <p className="rounded-[var(--store-radius-lg)] border border-dashed border-[#1C1C1C]/20 bg-white p-8 text-center font-montserrat text-sm text-[#4A4A4A]">
              Pronto publicaremos nuevas promociones para miembros. Únete para no perdértelas.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {promotions.map((promo, index) => (
                <ClubPromotionCard key={`${promo.validUntil}-${index}`} promo={promo} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
