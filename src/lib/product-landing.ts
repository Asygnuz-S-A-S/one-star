import type { LandingSectionType } from "@prisma/client"
import { productCutoutUrl } from "@/lib/cloudinary-loader"

/** Lo mínimo del producto que necesita la landing base (sale de ProductDTO). */
export interface ProductLandingSource {
  slug: string
  name: string
  brand: string | null
  basePrice: number
  isOnSale: boolean
  salePrice: number | null
  description: string | null
  extendedDescription: string | null
  metaDescription: string | null
  highlights: string[]
  faqs: { q: string; a: string }[]
  images: { url: string; alt: string }[]
  colorSiblings: { slug: string }[]
}

export interface ProductLandingSection {
  type: LandingSectionType
  config: Record<string, unknown>
}

const escapeHtml = (text: string) => text
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")

const clip = (text: string, max: number) => text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`

const formatPrice = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value)

const PRODUCT_LANDING_CSS = `.pl-detalles{max-width:960px;margin:0 auto;padding:64px 20px;color:#1C1C1C}
.pl-detalles h2{font-size:clamp(28px,4vw,44px);font-weight:900;text-transform:uppercase;letter-spacing:-0.03em;margin:0 0 24px}
.pl-detalles h3{font-size:18px;font-weight:800;text-transform:uppercase;margin:40px 0 12px}
.pl-detalles p{font-size:17px;line-height:1.6;margin:0 0 16px}
.pl-beneficios{list-style:none;padding:0;margin:0 0 24px;display:grid;gap:12px}
.pl-beneficios li{padding:14px 16px;border-left:4px solid #E31C23;background:#f5f5f5;font-weight:600}
.pl-faq{border-top:1px solid #ddd;padding:16px 0}
.pl-faq strong{display:block;margin-bottom:6px}
.pl-cta{display:inline-block;margin-top:24px;padding:16px 28px;background:#E31C23;color:#fff;font-weight:800;text-transform:uppercase;text-decoration:none}`

/** HTML del bloque de detalles: texto escapado; CustomHtmlBlock lo sanitiza otra vez al mostrarlo. */
function detailsHtml(product: ProductLandingSource, href: string): string {
  const price = product.isOnSale && product.salePrice ? product.salePrice : product.basePrice
  const story = product.extendedDescription || product.description
  const paragraphs = story
    ? story.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`)
    : ["<p>Cuenta aquí la historia del producto: para quién es, qué lo hace distinto y cómo se siente.</p>"]
  const highlights = product.highlights.length
    ? `<ul class="pl-beneficios">${product.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : ""
  const faqs = product.faqs.length
    ? `<h3>Preguntas frecuentes</h3>${product.faqs.map((faq) => `<div class="pl-faq"><strong>${escapeHtml(faq.q)}</strong><p>${escapeHtml(faq.a)}</p></div>`).join("")}`
    : ""
  return `<section class="pl-detalles" id="detalles">
<h2>Por qué te va a gustar</h2>
${highlights}
${paragraphs.join("\n")}
${faqs}
<a class="pl-cta" href="${escapeHtml(href)}">Comprar por ${escapeHtml(formatPrice(price))}</a>
</section>`
}

/**
 * Landing base para vender un producto: portada, vitrina (con sus colores), detalles y relacionados.
 * Solo usa secciones que el constructor ya sabe editar, para que el admin la termine a mano.
 */
export function buildProductLandingSections(
  product: ProductLandingSource,
  relatedSlugs: string[],
  { heroCutout = false }: { heroCutout?: boolean } = {},
): ProductLandingSection[] {
  const href = `/productos/${product.slug}`
  const cta = { label: "Comprar ahora", href }
  const headline = clip(product.name, 120)
  const copySource = product.metaDescription || product.description
  const copy = copySource ? clip(copySource.replace(/\s+/g, " ").trim(), 320) : undefined
  const eyebrow = product.brand ? clip(product.brand, 60) : undefined
  const photo = product.images.find((image) => image.url)
  // El hero no tiene imagen de respaldo: la versión sin fondo solo se usa si Cloudinary la puede generar.
  const foregroundMedia = photo
    ? { src: heroCutout ? productCutoutUrl(photo.url) : photo.url, alt: clip(photo.alt || product.name, 180) }
    : undefined

  const sections: ProductLandingSection[] = [
    {
      type: "HERO",
      config: {
        version: 1,
        kind: "campaignHero",
        accent: "carbon",
        headline,
        ...(copy && { copy }),
        primaryCta: cta,
        slides: [{
          id: "producto",
          accent: "carbon",
          ...(eyebrow && { eyebrow }),
          headline,
          ...(copy && { copy }),
          primaryCta: cta,
          // Sin spinMode: "static" agranda la foto al tamaño del giro 360, y una foto recortada sin fondo llenaba todo el ancho en móvil.
          ...(foregroundMedia && { foregroundMedia }),
        }],
      },
    },
    {
      type: "PRODUCT_CAROUSEL",
      config: {
        title: product.colorSiblings.length ? "Elige tu color" : "Elige el tuyo",
        layout: "showcase",
        theme: "light",
        productSlugs: [product.slug, ...product.colorSiblings.map((sibling) => sibling.slug)].slice(0, 8),
      },
    },
    { type: "CUSTOM_HTML", config: { html: detailsHtml(product, href), css: PRODUCT_LANDING_CSS } },
  ]

  if (relatedSlugs.length) {
    sections.push({
      type: "PRODUCT_CAROUSEL",
      config: { title: "También te puede gustar", layout: "carousel", theme: "light", productSlugs: relatedSlugs.slice(0, 8) },
    })
  }
  return sections
}
