import type { Metadata } from "next"
import { formatCOP } from "@/lib/shop-utils"
import { STANDARD_SHIPPING_COST, STANDARD_SHIPPING_THRESHOLD } from "@/lib/shipping"
import { DELIVERY_BUSINESS_DAYS } from "@/lib/conversion-signals"
import { RETURN_WINDOW_DAYS } from "@/lib/store-promises"
import { isRealColor } from "@/lib/colors"
import type { ProductFaq } from "@/lib/product-faq"

const TITLE_MAX = 60
const DESCRIPTION_MAX = 155

export interface SeoReview {
  userName: string
  rating: number
  title: string | null
  body: string
  createdAt: Date | string
}

export interface SeoProduct {
  name: string
  slug: string
  brand: string | null
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
  category: { name: string; slug: string }
  images: { url: string; alt?: string }[]
  variants: { sku: string; color: string; stock: number }[]
  basePrice: number
  salePrice: number | null
  isOnSale: boolean
  faqs: ProductFaq[]
}

export interface SeoContext {
  siteUrl: string
  storeName: string
  reviews: SeoReview[]
  reviewStats: { avg: number; count: number }
  returnWindowDays?: number
  /** Para fijar `priceValidUntil` de forma determinista en pruebas. */
  now?: Date
}

export function truncateAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

export function getDisplayPrice(product: Pick<SeoProduct, "basePrice" | "salePrice" | "isOnSale">): number {
  return product.isOnSale && product.salePrice ? product.salePrice : product.basePrice
}

export function buildProductTitle(product: SeoProduct, storeName: string): string {
  if (product.metaTitle?.trim()) return product.metaTitle.trim()
  const suffix = ` | ${storeName}`
  const withBrand =
    product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
      ? `${product.name} ${product.brand}`
      : product.name
  const commercial = ` | Comprar en Colombia - ${storeName}`
  if (withBrand.length + commercial.length <= TITLE_MAX) return `${withBrand}${commercial}`
  if (withBrand.length + suffix.length <= TITLE_MAX) return `${withBrand}${suffix}`
  if (product.name.length + suffix.length <= TITLE_MAX) return `${product.name}${suffix}`
  return `${truncateAtWord(product.name, TITLE_MAX - suffix.length)}${suffix}`
}

export function buildProductDescription(product: SeoProduct, storeName: string, returnWindowDays = RETURN_WINDOW_DAYS): string {
  if (product.metaDescription?.trim()) return truncateAtWord(product.metaDescription, DESCRIPTION_MAX)
  const base = product.description?.trim()
  if (base && base.length >= 70) return truncateAtWord(base, DESCRIPTION_MAX)
  const brandPart = product.brand ? ` ${product.brand}` : ""
  const generated =
    `Compra ${product.name}${brandPart} en ${storeName} desde ${formatCOP(getDisplayPrice(product))}. ` +
    `Envío a todo Colombia y ${returnWindowDays} días para cambios.`
  return truncateAtWord(base ? `${base} ${generated}` : generated, DESCRIPTION_MAX)
}

export function absoluteUrl(url: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`
}

export function buildProductUrl(slug: string, siteUrl: string): string {
  return `${siteUrl}/productos/${slug}`
}

export function buildProductMetadata(product: SeoProduct, ctx: SeoContext): Metadata {
  const returnDays = ctx.returnWindowDays ?? RETURN_WINDOW_DAYS
  const title = buildProductTitle(product, ctx.storeName)
  const description = buildProductDescription(product, ctx.storeName, returnDays)
  const url = buildProductUrl(product.slug, ctx.siteUrl)
  const images = product.images.slice(0, 4).map((image) => ({
    url: absoluteUrl(image.url, ctx.siteUrl),
    alt: image.alt || product.name,
  }))
  const price = getDisplayPrice(product)

  return {
    title: { absolute: title },
    description,
    // ?color= y otros parámetros apuntan siempre a la URL limpia del producto.
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, siteName: ctx.storeName, locale: "es_CO", images },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
    other: {
      "product:price:amount": String(Math.round(price)),
      "product:price:currency": "COP",
      "product:availability": product.variants.some((v) => v.stock > 0) ? "in stock" : "out of stock",
      ...(product.brand ? { "product:brand": product.brand } : {}),
    },
  }
}

function priceValidUntil(now: Date): string {
  const d = new Date(now)
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

export function buildProductJsonLd(product: SeoProduct, ctx: SeoContext): Record<string, unknown> {
  const returnDays = ctx.returnWindowDays ?? RETURN_WINDOW_DAYS
  const url = buildProductUrl(product.slug, ctx.siteUrl)
  const price = getDisplayPrice(product)
  const inStock = product.variants.some((v) => v.stock > 0)
  const colors = [...new Set(product.variants.map((v) => v.color).filter(isRealColor))]
  const seller = { "@type": "Organization", name: ctx.storeName, url: ctx.siteUrl }

  const offer = {
    "@type": "Offer",
    url,
    price: price.toFixed(0),
    priceCurrency: "COP",
    priceValidUntil: priceValidUntil(ctx.now ?? new Date()),
    availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller,
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: price >= STANDARD_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST,
        currency: "COP",
      },
      shippingDestination: { "@type": "DefinedRegion", addressCountry: "CO" },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: DELIVERY_BUSINESS_DAYS.min,
          maxValue: DELIVERY_BUSINESS_DAYS.max,
          unitCode: "DAY",
        },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "CO",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: returnDays,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
  }

  const productNode: Record<string, unknown> = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    image: product.images.map((i) => absoluteUrl(i.url, ctx.siteUrl)),
    category: product.category.name,
    offers: offer,
  }
  const description = buildProductDescription(product, ctx.storeName, returnDays)
  if (description) productNode.description = description
  if (product.variants[0]?.sku) productNode.sku = product.variants[0].sku
  if (product.brand) productNode.brand = { "@type": "Brand", name: product.brand }
  if (colors.length > 0) productNode.color = colors.join(", ")

  if (ctx.reviewStats.count > 0) {
    productNode.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ctx.reviewStats.avg.toFixed(1),
      reviewCount: ctx.reviewStats.count,
      bestRating: 5,
      worstRating: 1,
    }
    productNode.review = ctx.reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.userName },
      datePublished: new Date(review.createdAt).toISOString().slice(0, 10),
      ...(review.title ? { name: review.title } : {}),
      reviewBody: review.body,
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    }))
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Inicio", item: ctx.siteUrl },
      { name: "Productos", item: `${ctx.siteUrl}/productos` },
      { name: product.category.name, item: `${ctx.siteUrl}/c/${product.category.slug}` },
      { name: product.name, item: url },
    ].map((entry, index) => ({ "@type": "ListItem", position: index + 1, ...entry })),
  }

  const graph: Record<string, unknown>[] = [productNode, breadcrumb]
  if (product.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: product.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    })
  }

  return { "@context": "https://schema.org", "@graph": graph }
}

/** JSON-LD seguro para incrustar en un <script>: evita cerrar la etiqueta con "</script>". */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(new RegExp("\\u2028", "g"), "\\u2028")
    .replace(new RegExp("\\u2029", "g"), "\\u2029")
}
