import type { ReactNode } from "react"
import type { LandingSection, LandingSectionType } from "@prisma/client"

import HeroBanner from "@/components/home/HeroBanner"
import EditorialCampaignHero from "@/components/home/EditorialCampaignHero"
import EditorialBlock from "@/components/home/EditorialBlock"
import CategoryGrid from "@/components/home/CategoryGrid"
import FeaturedProducts from "@/components/home/FeaturedProducts"
import BrandStrip from "@/components/home/BrandStrip"
import NewArrivals from "@/components/home/NewArrivals"
import NewsletterSection from "@/components/home/NewsletterSection"
import CustomHtmlBlock from "@/components/home/CustomHtmlBlock"
import ProductCarousel from "@/components/home/ProductCarousel"
import MediaCarousel from "@/components/home/MediaCarousel"

import { getVisibleBanners } from "@/server/services/banner.service"
import { getVisibleGridBlocks } from "@/server/services/home-grid.service"
import { getStorefrontBrands } from "@/server/services/brand.service"
import { getTopBanner } from "@/server/repositories/top-banner.repository"
import { parseEditorialConfig, type EditorialConfig } from "@/lib/editorial-config"

type SectionContext = {
  banners: Awaited<ReturnType<typeof getVisibleBanners>>
  brands: Awaited<ReturnType<typeof getStorefrontBrands>>
  config: Record<string, unknown>
  editorial: EditorialConfig
  gridBlocks: Awaited<ReturnType<typeof getVisibleGridBlocks>>
  id: string
  isBannerActive: boolean
  isFirst: boolean
}

/**
 * Registro de secciones del landing builder. Agregar un tipo nuevo = valor en el enum
 * `LandingSectionType` + una entrada aquí + sus campos en el editor; el resto de la
 * tienda no cambia. Cada sección debe usar las primitivas del sistema visual
 * (`.store-section`, `.store-gutter`, `.store-heading`).
 */
const SECTION_RENDERERS: Record<LandingSectionType, (ctx: SectionContext) => ReactNode> = {
  HERO: (ctx) => ctx.editorial.kind === "campaignHero"
    ? <EditorialCampaignHero key={ctx.id} campaign={ctx.editorial} />
    : <HeroBanner key={ctx.id} banners={ctx.banners} config={ctx.config} isFirst={ctx.isFirst} isBannerActive={ctx.isBannerActive} />,
  CATEGORY_GRID: (ctx) => <CategoryGrid key={ctx.id} blocks={ctx.gridBlocks} config={ctx.config} />,
  FEATURED_PRODUCTS: (ctx) => <FeaturedProducts key={ctx.id} config={ctx.config} />,
  BRAND_STRIP: (ctx) => <BrandStrip key={ctx.id} brands={ctx.brands} config={ctx.config} />,
  NEW_ARRIVALS: (ctx) => <NewArrivals key={ctx.id} config={ctx.config} />,
  NEWSLETTER: (ctx) => <NewsletterSection key={ctx.id} config={ctx.config} />,
  CUSTOM_HTML: (ctx) => (
    <CustomHtmlBlock
      key={ctx.id}
      html={typeof ctx.config.html === "string" ? ctx.config.html : ""}
      css={typeof ctx.config.css === "string" ? ctx.config.css : ""}
    />
  ),
  PRODUCT_CAROUSEL: (ctx) => <ProductCarousel key={ctx.id} config={ctx.config} />,
  MEDIA_CAROUSEL: (ctx) => <MediaCarousel key={ctx.id} config={ctx.config} />,
}

function sectionConfig(section: LandingSection): Record<string, unknown> {
  return typeof section.config === "object" && section.config !== null && !Array.isArray(section.config)
    ? section.config as Record<string, unknown>
    : {}
}

/** Renderiza las secciones activas de una landing (home o campaña) con datos compartidos en paralelo. */
export default async function LandingSections({ sections }: { sections: LandingSection[] }) {
  // Fallbacks por consulta: un fallo puntual no tumba toda la landing.
  const [banners, gridBlocks, brands, topBanner] = await Promise.all([
    getVisibleBanners().catch((error: unknown) => {
      console.error("[landing] getVisibleBanners falló:", error)
      return []
    }),
    getVisibleGridBlocks().catch((error: unknown) => {
      console.error("[landing] getVisibleGridBlocks falló:", error)
      return []
    }),
    getStorefrontBrands().catch((error: unknown) => {
      console.error("[landing] getStorefrontBrands falló:", error)
      return []
    }),
    getTopBanner().catch((error: unknown) => {
      console.error("[landing] getTopBanner falló:", error)
      return null
    }),
  ])
  const isBannerActive = topBanner?.isActive ?? true

  return (
    <>
      {/* El orden lo decide el admin en el constructor (posición); no se reordena por tipo. */}
      {sections.map((section, index) => {
        const config = sectionConfig(section)
        const editorial = parseEditorialConfig(config)
        if (editorial.kind === "editorialBlock") return <div key={section.id} className="store-reveal"><EditorialBlock block={editorial} /></div>

        const render = SECTION_RENDERERS[section.type]
        if (!render) return null
        const node = render({ banners, brands, config, editorial, gridBlocks, id: section.id, isBannerActive, isFirst: index === 0 })
        // La primera sección (hero) no se anima al entrar: ya está en pantalla y es el LCP.
        return index === 0 || !node ? node : <div key={section.id} className="store-reveal">{node}</div>
      })}
    </>
  )
}
