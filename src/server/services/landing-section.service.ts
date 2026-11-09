import "server-only"

import type { LandingSection, Prisma } from "@prisma/client"
import { getAdminSession } from "@/server/auth/require-admin"
import * as repository from "@/server/repositories/landing-section.repository"
import {
  LandingPageSchema,
  LandingSectionConfigSchema,
  LandingSectionPositionsSchema,
  LandingSectionTypeSchema,
} from "@/server/validators/landing-section.validator"
import { campaignHeroDefaults, collectionTileDefaults } from "@/lib/editorial-builder-form"
import { isReservedLandingSlug } from "@/lib/landing-paths"
import { buildProductLandingSections } from "@/lib/product-landing"
import { getProductBySlug, getRelatedProducts } from "@/server/services/product.service"
import { EditorialContentConfigSchema } from "@/server/validators/editorial-content.validator"

export async function getAllLandingSections(page: string = repository.HOME_LANDING_PAGE) {
  return repository.getAllLandingSections(LandingPageSchema.parse(page))
}

export async function getActiveLandingSections(page: string = repository.HOME_LANDING_PAGE) {
  return repository.getActiveLandingSections(LandingPageSchema.parse(page))
}

export function applyLandingDraft(section: LandingSection): LandingSection {
  if (section.draftConfig == null) return section
  return { ...section, config: section.draftConfig }
}

export interface LandingPageSettings {
  slug: string
  title: string | null
  description: string | null
  isActive: boolean
}

/** Ajustes de la landing; sin fila guardada está activa y sin título propio. */
export async function getLandingPageSettings(page: string): Promise<LandingPageSettings> {
  const slug = LandingPageSchema.parse(page)
  const row = await repository.findLandingPageSettings(slug)
  return { slug, title: row?.title ?? null, description: row?.description ?? null, isActive: row?.isActive ?? true }
}

export async function saveLandingPageSettings(settings: LandingPageSettings) {
  const slug = LandingPageSchema.parse(settings.slug)
  if (slug === repository.HOME_LANDING_PAGE) throw new Error("El inicio no se puede desactivar")
  return repository.upsertLandingPageSettings(slug, { title: settings.title, description: settings.description, isActive: settings.isActive })
}

export async function getPublicLandingPages() {
  return repository.findPublicLandingPages()
}

/** La vista previa del constructor muestra el borrador solo a un admin. El resto ve lo publicado. */
export async function getLandingSectionsForRequest(page: string, preview: boolean) {
  const [sections, settings] = await Promise.all([
    getActiveLandingSections(page),
    page === repository.HOME_LANDING_PAGE ? null : getLandingPageSettings(page),
  ])
  const session = preview ? await getAdminSession() : null
  // Una landing desactivada no existe para el público; el admin la sigue viendo en la vista previa.
  if (settings && !settings.isActive && !session) return []
  return session ? sections.map(applyLandingDraft) : sections
}

export async function getLandingPages() {
  const pages = await repository.getLandingPages()
  return [repository.HOME_LANDING_PAGE, ...pages.filter((page) => page !== repository.HOME_LANDING_PAGE)]
}

export async function updateLandingSectionPositions(updates: { id: string; position: number }[]) {
  return repository.updateLandingSectionPositions(LandingSectionPositionsSchema.parse(updates))
}

export async function setLandingSectionActive(id: string, isActive: boolean) {
  return repository.updateLandingSection(id, { isActive })
}

export async function updateLandingSectionConfig(id: string, config: Prisma.InputJsonValue) {
  const validConfig = LandingSectionConfigSchema.parse(config) as Prisma.InputJsonObject
  return repository.updateLandingSection(id, { draftConfig: validConfig })
}

export async function publishLandingPage(page: string) {
  return repository.publishLandingDrafts(LandingPageSchema.parse(page))
}

export async function createLandingSection(type: string, page: string = repository.HOME_LANDING_PAGE) {
  const validType = LandingSectionTypeSchema.parse(type)
  const validPage = LandingPageSchema.parse(page)
  // Una landing nueva no puede usar el nombre de una ruta fija de la tienda (la taparía).
  if (isReservedLandingSlug(validPage) && (await repository.getAllLandingSections(validPage)).length === 0) {
    throw new Error(`"${validPage}" es una ruta de la tienda; elige otro nombre`)
  }
  const position = (await repository.getMaximumLandingSectionPosition(validPage)) + 1

  let defaultConfig: Prisma.InputJsonObject = {}
  if (validType === "HERO") {
    defaultConfig = campaignHeroDefaults() as Prisma.InputJsonObject
  }
  if (validType === "CATEGORY_GRID") {
    defaultConfig = collectionTileDefaults() as Prisma.InputJsonObject
  }
  if (validType === "MEDIA_CAROUSEL") {
    defaultConfig = {
      title: "PROMOS Y NOVEDADES",
      subtitle: "Descubre las últimas tendencias y colecciones exclusivas",
      layout: "full-width",
      height: "fit",
      animation: "slide",
      autoplay: true,
      autoplayInterval: 6,
      showArrows: true,
      showDots: true,
      items: [
        {
          id: "slide-" + Date.now(),
          mediaType: "image",
          imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1920&auto=format&fit=crop",
          badge: "NUEVA TEMPORADA",
          title: "ESTILO URBANO SIN LÍMITES",
          subtitle: "Descubre los últimos lanzamientos diseñados para destacar.",
          ctaText: "VER COLECCIÓN",
          ctaLink: "/productos",
          contentPosition: "bottom-left",
          overlayOpacity: 45,
          textColor: "light",
        },
      ],
    }
  }

  return repository.createLandingSection({
    page: validPage,
    type: validType,
    position,
    isActive: true,
    config: defaultConfig,
  })
}

/**
 * Arma una landing base desde un producto publicado. Queda desactivada (solo el admin la ve en la
 * vista previa) hasta que la termine y la active desde los ajustes.
 */
export async function createLandingFromProduct(page: string, productSlug: string) {
  const slug = LandingPageSchema.parse(page)
  if (slug === repository.HOME_LANDING_PAGE || isReservedLandingSlug(slug)) {
    throw new Error(`"${slug}" es una ruta de la tienda; elige otro nombre`)
  }
  if ((await repository.getAllLandingSections(slug)).length > 0) {
    throw new Error(`Ya existe una landing en /${slug}; elige otro nombre`)
  }
  const product = await getProductBySlug(productSlug)
  if (!product) throw new Error("El producto no existe o no está publicado")
  const related = await getRelatedProducts(product.categoryId, product.slug, 8).catch(() => [])
  const sections = buildProductLandingSections(product, related.map((item) => item.slug))
  // El hero debe pasar el mismo validador que el editor, para que el admin pueda guardarlo después.
  EditorialContentConfigSchema.parse(sections[0].config)
  await repository.createLandingPageWithSections(
    slug,
    { title: (product.metaTitle || product.name).slice(0, 70), description: product.metaDescription?.slice(0, 160) ?? null, isActive: false },
    sections.map((section) => ({ type: section.type, config: section.config as Prisma.InputJsonObject })),
  )
  return slug
}

export async function deleteLandingSection(id: string) {
  return repository.deleteLandingSection(id)
}
