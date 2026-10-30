import { isSafePublicUrl } from "@/lib/safe-url"

export type EditorialAppearance = "light" | "carbon" | "oneStarRed"
/** Cómo se mueve el producto con fotos del giro: quieto, girando solo o siguiendo el mouse. */
export type HeroSpinMode = "static" | "auto" | "mouse"
export const HERO_SPIN_MODES: HeroSpinMode[] = ["auto", "mouse", "static"]

type EditorialCta = { href: string; label: string }
type EditorialMedia = { alt: string; src: string }

export type CampaignHeroSlide = {
  accent: EditorialAppearance
  copy?: string
  desktopMedia?: EditorialMedia
  eyebrow?: string
  foregroundMedia?: EditorialMedia
  /** Tomas en orden para recorrer el producto. Hacen falta al menos dos. */
  angles?: EditorialMedia[]
  /** Sin valor: "auto". */
  spinMode?: HeroSpinMode
  headline: string
  id: string
  mobileMedia?: EditorialMedia
  tabletMedia?: EditorialMedia
  primaryCta: EditorialCta
  secondaryCta?: EditorialCta
}

export type CampaignHeroConfig = {
  accent: EditorialAppearance
  copy?: string
  desktopMedia?: EditorialMedia
  eyebrow?: string
  foregroundMedia?: EditorialMedia
  angles?: EditorialMedia[]
  spinMode?: HeroSpinMode
  headline: string
  kind: "campaignHero"
  mobileMedia?: EditorialMedia
  tabletMedia?: EditorialMedia
  primaryCta: EditorialCta
  secondaryCta?: EditorialCta
  version: 1
  slides?: CampaignHeroSlide[]
}

export type EditorialBlockConfig = {
  appearance: EditorialAppearance
  body?: string
  cta?: EditorialCta
  kind: "editorialBlock"
  media?: EditorialMedia
  title: string
  version: 1
}

export type CollectionTileConfig = {
  kind: "collectionTile"
  tiles: Array<{ appearance: EditorialAppearance; href?: string; id: string; media?: EditorialMedia; title?: string }>
  version: 1
}

export type EditorialConfig = CampaignHeroConfig | CollectionTileConfig | EditorialBlockConfig | { kind: "legacy" }

const appearances = new Set<EditorialAppearance>(["light", "carbon", "oneStarRed"])

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function appearance(value: unknown): EditorialAppearance {
  return typeof value === "string" && appearances.has(value as EditorialAppearance) ? value as EditorialAppearance : "carbon"
}

/** Fotos del giro: 72 = una vuelta de 5° por cuadro. */
export const MAX_HERO_ANGLES = 72

function angleList(value: unknown, fallbackAlt: string): EditorialMedia[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.flatMap((item) => {
    const parsed = media(item)
    if (parsed) return [parsed]
    const src = typeof item === "string" ? text(item) : undefined
    return src && isSafePublicUrl(src) ? [{ src, alt: fallbackAlt }] : []
  })
  return items.length > 0 ? items.slice(0, MAX_HERO_ANGLES) : undefined
}

function media(value: unknown): EditorialMedia | undefined {
  const item = record(value)
  const src = text(item?.src)
  const alt = text(item?.alt)
  return src && alt && isSafePublicUrl(src) ? { src, alt } : undefined
}

function cta(value: unknown): EditorialCta | undefined {
  const item = record(value)
  const label = text(item?.label)
  const href = text(item?.href)
  return label && href && isSafePublicUrl(href) ? { label, href } : undefined
}

/** Reads the additive v1 presentation schema without altering legacy JSON. */
export function parseEditorialConfig(value: unknown): EditorialConfig {
  const config = record(value)
  if (config?.version !== 1 || typeof config.kind !== "string") return { kind: "legacy" }

  if (config.kind === "campaignHero") {
    const campaignSlide = (value: unknown, index: number): CampaignHeroSlide | undefined => {
      const slide = record(value)
      const headline = text(slide?.headline)
      const primaryCta = cta(slide?.primaryCta)
      if (!headline || !primaryCta) return undefined
      const copy = text(slide?.copy)
      const eyebrow = text(slide?.eyebrow)
      const secondaryCta = cta(slide?.secondaryCta)
      return {
        id: text(slide?.id) ?? `campaign-${index + 1}`,
        headline,
        primaryCta,
        accent: appearance(slide?.accent),
        ...(copy ? { copy } : {}),
        ...(eyebrow ? { eyebrow } : {}),
        ...(secondaryCta ? { secondaryCta } : {}),
        ...(media(slide?.desktopMedia) ? { desktopMedia: media(slide?.desktopMedia) } : {}),
        ...(media(slide?.mobileMedia) ? { mobileMedia: media(slide?.mobileMedia) } : {}),
        ...(media(slide?.tabletMedia) ? { tabletMedia: media(slide?.tabletMedia) } : {}),
        ...(media(slide?.foregroundMedia) ? { foregroundMedia: media(slide?.foregroundMedia) } : {}),
        ...(angleList(slide?.angles, headline) ? { angles: angleList(slide?.angles, headline) } : {}),
        ...(HERO_SPIN_MODES.includes(slide?.spinMode as HeroSpinMode) ? { spinMode: slide?.spinMode as HeroSpinMode } : {}),
      }
    }
    const slides = Array.isArray(config.slides) ? config.slides.flatMap((slide, index) => {
      const parsed = campaignSlide(slide, index)
      return parsed ? [parsed] : []
    }) : []
    const parsedLegacySlide = campaignSlide(config, 0)
    const firstSlide = slides[0] ?? parsedLegacySlide
    if (!firstSlide) return { kind: "legacy" }
    return {
      version: 1,
      kind: "campaignHero",
      ...firstSlide,
      ...(slides.length ? { slides } : {}),
    }
  }

  if (config.kind === "collectionTile") {
    if (!Array.isArray(config.tiles)) return { kind: "legacy" }
    const tiles = config.tiles.flatMap((value) => {
      const item = record(value)
      const id = text(item?.id)
      return id ? [{ id, appearance: appearance(item?.appearance), ...(text(item?.title) ? { title: text(item?.title) } : {}), ...(text(item?.href) && isSafePublicUrl(text(item?.href)!) ? { href: text(item?.href) } : {}), ...(media(item?.media) ? { media: media(item?.media) } : {}) }] : []
    })
    return { version: 1, kind: "collectionTile", tiles }
  }

  if (config.kind === "editorialBlock") {
    const title = text(config.title)
    if (!title) return { kind: "legacy" }
    const body = text(config.body)
    const action = cta(config.cta)
    return {
      version: 1,
      kind: "editorialBlock",
      title,
      appearance: appearance(config.appearance),
      ...(body ? { body } : {}),
      ...(action ? { cta: action } : {}),
      ...(media(config.media) ? { media: media(config.media) } : {}),
    }
  }

  return { kind: "legacy" }
}

export function resolveCollectionTiles(value: unknown) {
  const config = parseEditorialConfig(value)
  const tiles = new Map<string, { alt?: string; appearance: EditorialAppearance; href?: string; src?: string; title?: string }>()
  if (config.kind !== "collectionTile") return tiles
  for (const tile of config.tiles) {
    tiles.set(tile.id, { appearance: tile.appearance, ...(tile.title ? { title: tile.title } : {}), ...(tile.href ? { href: tile.href } : {}), ...(tile.media ? tile.media : {}) })
  }
  return tiles
}

/** Normalizes old single campaigns and new multi-slide campaigns for public rendering. */
export function resolveCampaignSlides(campaign: CampaignHeroConfig): CampaignHeroSlide[] {
  return campaign.slides?.length ? campaign.slides : [{
    id: "campaign-1",
    accent: campaign.accent,
    headline: campaign.headline,
    primaryCta: campaign.primaryCta,
    ...(campaign.copy ? { copy: campaign.copy } : {}),
    ...(campaign.eyebrow ? { eyebrow: campaign.eyebrow } : {}),
    ...(campaign.secondaryCta ? { secondaryCta: campaign.secondaryCta } : {}),
    ...(campaign.desktopMedia ? { desktopMedia: campaign.desktopMedia } : {}),
    ...(campaign.tabletMedia ? { tabletMedia: campaign.tabletMedia } : {}),
    ...(campaign.mobileMedia ? { mobileMedia: campaign.mobileMedia } : {}),
    ...(campaign.foregroundMedia ? { foregroundMedia: campaign.foregroundMedia } : {}),
    ...(campaign.angles?.length ? { angles: campaign.angles } : {}),
    ...(campaign.spinMode ? { spinMode: campaign.spinMode } : {}),
  }]
}
