import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import LandingSections from "@/components/landing/LandingSections"
import { parseEditorialConfig } from "@/lib/editorial-config"
import { getActiveLandingSections } from "@/server/services/landing-section.service"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ slug: string }> }

async function loadSections(slug: string) {
  if (slug === "home") redirect("/")
  // Un slug inválido se trata igual que una campaña inexistente.
  return getActiveLandingSections(slug).catch(() => [])
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const sections = await loadSections(slug)
  const hero = sections
    .map((section) => parseEditorialConfig((section.config ?? {}) as Record<string, unknown>))
    .find((config) => config.kind === "campaignHero")
  const title = hero?.kind === "campaignHero" ? hero.headline : slug.replaceAll("-", " ")
  return {
    title: `${title} | One Star`,
    description: hero?.kind === "campaignHero" ? hero.copy : undefined,
    alternates: { canonical: `/campanas/${slug}` },
  }
}

export default async function CampaignLandingPage({ params }: Props) {
  const { slug } = await params
  const sections = await loadSections(slug)
  if (sections.length === 0) notFound()
  return <LandingSections sections={sections} />
}
