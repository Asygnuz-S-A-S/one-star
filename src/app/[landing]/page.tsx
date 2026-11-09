import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import LandingSections from "@/components/landing/LandingSections"
import { parseEditorialConfig } from "@/lib/editorial-config"
import { isReservedLandingSlug } from "@/lib/landing-paths"
import { getLandingPageSettings, getLandingSectionsForRequest } from "@/server/services/landing-section.service"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ landing: string }>; searchParams: Promise<{ preview?: string }> }

/** Las rutas fijas de la tienda siempre ganan; un slug inválido o reservado es un 404. */
async function validSlug(params: Props["params"]): Promise<string> {
  const { landing } = await params
  if (landing === "home") redirect("/")
  if (isReservedLandingSlug(landing)) notFound()
  return landing
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const slug = await validSlug(params)
  const { preview } = await searchParams
  const [settings, sections] = await Promise.all([
    getLandingPageSettings(slug).catch(() => null),
    getLandingSectionsForRequest(slug, preview === "true").catch(() => []),
  ])
  // Aquí (antes de que empiece a cargar la página) notFound responde un 404 real, no un "404 suave".
  if (sections.length === 0) notFound()
  const hero = sections
    .map((section) => parseEditorialConfig((section.config ?? {}) as Record<string, unknown>))
    .find((config) => config.kind === "campaignHero")
  const title = settings?.title || (hero?.kind === "campaignHero" ? hero.headline : slug.replaceAll("-", " "))
  return {
    title: `${title} | One Star`,
    description: settings?.description || (hero?.kind === "campaignHero" ? hero.copy : undefined),
    alternates: { canonical: `/${slug}` },
  }
}

export default async function LandingPage({ params, searchParams }: Props) {
  const slug = await validSlug(params)
  const { preview } = await searchParams
  const sections = await getLandingSectionsForRequest(slug, preview === "true").catch(() => [])
  if (sections.length === 0) notFound()
  return <LandingSections sections={sections} />
}
