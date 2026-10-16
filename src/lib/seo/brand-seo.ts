import type { Metadata } from "next"
import type { ProductFaq } from "@/lib/product-faq"
import { absoluteUrl, truncateAtWord } from "@/lib/seo/product-seo"

const TITLE_MAX = 60
const DESCRIPTION_MAX = 155

export interface SeoBrand {
  name: string
  slug: string
  description?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  faqs: ProductFaq[]
}

export interface SeoBrandProduct {
  name: string
  slug: string
  imageUrl?: string | null
  price?: number
}

export interface BrandSeoContext {
  siteUrl: string
  storeName: string
  products?: SeoBrandProduct[]
}

export function buildBrandUrl(slug: string, siteUrl: string): string {
  return `${siteUrl}/marcas/${slug}`
}

export function buildBrandTitle(brand: SeoBrand, storeName: string): string {
  if (brand.metaTitle?.trim()) return brand.metaTitle.trim()
  const suffix = ` | ${storeName}`
  const base = `${brand.name} Colombia - Zapatillas y Calzado Original`
  if (base.length + suffix.length <= TITLE_MAX) return `${base}${suffix}`
  const short = `Zapatillas ${brand.name} Originales`
  if (short.length + suffix.length <= TITLE_MAX) return `${short}${suffix}`
  return `${brand.name}${suffix}`
}

export function buildBrandDescription(brand: SeoBrand, storeName: string): string {
  if (brand.metaDescription?.trim()) return truncateAtWord(brand.metaDescription, DESCRIPTION_MAX)
  if (brand.description?.trim() && brand.description.trim().length >= 60) {
    return truncateAtWord(brand.description.trim(), DESCRIPTION_MAX)
  }
  const fallback =
    `Descubre la colección de calzado ${brand.name} en ${storeName}. ` +
    `100% originales, envíos a todo Colombia y garantía de cambios.`
  return truncateAtWord(fallback, DESCRIPTION_MAX)
}

export function buildBrandMetadata(brand: SeoBrand, ctx: BrandSeoContext): Metadata {
  const title = buildBrandTitle(brand, ctx.storeName)
  const description = buildBrandDescription(brand, ctx.storeName)
  const url = buildBrandUrl(brand.slug, ctx.siteUrl)
  const images: { url: string; alt?: string }[] = []

  if (brand.bannerUrl) {
    images.push({ url: absoluteUrl(brand.bannerUrl, ctx.siteUrl), alt: `${brand.name} Banner` })
  }
  if (brand.logoUrl) {
    images.push({ url: absoluteUrl(brand.logoUrl, ctx.siteUrl), alt: `Logo ${brand.name}` })
  }

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: ctx.storeName,
      locale: "es_CO",
      ...(images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images.length > 0 ? { images: images.map((i) => i.url) } : {}),
    },
  }
}

/**
 * JSON-LD para la página de marca.
 * Incluye CollectionPage/ItemList, Brand/Organization, BreadcrumbList y FAQPage.
 * REGLA ESTRICTA: Sin aggregateRating ni reviews para evitar penalizaciones de Google (self-serving reviews).
 */
export function buildBrandJsonLd(brand: SeoBrand, ctx: BrandSeoContext): Record<string, unknown> {
  const url = buildBrandUrl(brand.slug, ctx.siteUrl)
  const title = buildBrandTitle(brand, ctx.storeName)
  const description = buildBrandDescription(brand, ctx.storeName)

  const brandNode: Record<string, unknown> = {
    "@type": "Brand",
    "@id": `${url}#brand`,
    name: brand.name,
    url,
  }
  if (brand.logoUrl) {
    brandNode.logo = absoluteUrl(brand.logoUrl, ctx.siteUrl)
  }
  if (brand.description) {
    brandNode.description = brand.description
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Inicio", item: ctx.siteUrl },
      { name: "Marcas", item: `${ctx.siteUrl}/marcas` },
      { name: brand.name, item: url },
    ].map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry })),
  }

  const collectionPageNode: Record<string, unknown> = {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: title,
    url,
    description,
    about: { "@id": `${url}#brand` },
  }

  if (ctx.products && ctx.products.length > 0) {
    collectionPageNode.mainEntity = {
      "@type": "ItemList",
      itemListElement: ctx.products.map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${ctx.siteUrl}/productos/${p.slug}`,
        name: p.name,
        ...(p.imageUrl ? { image: absoluteUrl(p.imageUrl, ctx.siteUrl) } : {}),
      })),
    }
  }

  const graph: Record<string, unknown>[] = [brandNode, collectionPageNode, breadcrumb]

  if (brand.faqs && brand.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: brand.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    })
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  }
}
