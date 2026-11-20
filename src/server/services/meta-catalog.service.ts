import "server-only"
import {
  findMetaCatalogProducts,
  type MetaCatalogProductRow,
} from "../repositories/meta-catalog.repository"

/**
 * Feed de catálogo de productos para Meta (Commerce Manager → Fuentes de datos
 * → Feed programado). Meta descarga la URL cada cierto tiempo y actualiza el
 * catálogo que usan los anuncios dinámicos.
 *
 * REGLA CRÍTICA: el `id` de cada item es el `Product.id`, el mismo valor que el
 * píxel manda en `content_ids`. Si dejan de coincidir, Meta no puede emparejar
 * el evento con el producto y los anuncios dinámicos dejan de funcionar.
 */

/** Tope de items por feed. Meta admite más, pero esto acota memoria y tiempo. */
export const META_CATALOG_MAX_ITEMS = 5000
export const META_CATALOG_CURRENCY = "COP"

export interface MetaCatalogItem {
  id: string
  title: string
  description: string
  availability: "in stock" | "out of stock"
  condition: "new"
  price: string
  salePrice: string | null
  link: string
  imageLink: string
  additionalImageLinks: string[]
  brand: string
  productType: string
  gender: "male" | "female" | "unisex" | null
  ageGroup: "adult" | "kids" | null
  inventory: number
}

const GENDER_MAP: Record<string, { gender: MetaCatalogItem["gender"]; ageGroup: MetaCatalogItem["ageGroup"] }> = {
  HOMBRE: { gender: "male", ageGroup: "adult" },
  MUJER: { gender: "female", ageGroup: "adult" },
  UNISEX: { gender: "unisex", ageGroup: "adult" },
  NINO: { gender: "male", ageGroup: "kids" },
  NINA: { gender: "female", ageGroup: "kids" },
  INFANTIL: { gender: "unisex", ageGroup: "kids" },
}

/** Meta exige precio con moneda: "150000 COP". El peso no lleva decimales. */
export function formatMetaPrice(value: number): string {
  return `${Math.round(value)} ${META_CATALOG_CURRENCY}`
}

export function absoluteUrl(url: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${siteUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`
}

/** Meta corta la descripción en 5000 caracteres; se la mandamos ya recortada. */
function buildDescription(product: MetaCatalogProductRow): string {
  const raw = product.description?.trim()
  const fallback = [product.brand?.name, product.name].filter(Boolean).join(" ")
  const text = raw && raw.length > 0 ? raw : fallback
  return text.slice(0, 5000)
}

export function buildMetaCatalogItems(
  products: readonly MetaCatalogProductRow[],
  siteUrl: string,
): MetaCatalogItem[] {
  const items: MetaCatalogItem[] = []

  for (const product of products) {
    const [firstImage, ...restImages] = product.images
    // El repositorio ya filtra por imagen, pero no confiamos: sin imagen Meta
    // rechaza el item entero y ensucia el informe de errores del feed.
    if (!firstImage) continue

    const basePrice = Number(product.basePrice)
    if (!Number.isFinite(basePrice) || basePrice <= 0) continue

    const rawSalePrice = product.salePrice === null ? null : Number(product.salePrice)
    const hasSale =
      product.isOnSale &&
      rawSalePrice !== null &&
      Number.isFinite(rawSalePrice) &&
      rawSalePrice > 0 &&
      rawSalePrice < basePrice

    const inventory = product.variants.reduce((sum, variant) => sum + Math.max(variant.stock, 0), 0)
    const genderInfo = product.gender ? GENDER_MAP[product.gender] : undefined

    items.push({
      id: product.id,
      title: product.name.slice(0, 200),
      description: buildDescription(product),
      availability: inventory > 0 ? "in stock" : "out of stock",
      condition: "new",
      price: formatMetaPrice(basePrice),
      salePrice: hasSale ? formatMetaPrice(rawSalePrice) : null,
      link: `${siteUrl.replace(/\/+$/, "")}/productos/${product.slug}`,
      imageLink: absoluteUrl(firstImage.url, siteUrl),
      additionalImageLinks: restImages.map((image) => absoluteUrl(image.url, siteUrl)),
      brand: product.brand?.name ?? "One Star",
      productType: product.category?.name ?? "",
      gender: genderInfo?.gender ?? null,
      ageGroup: genderInfo?.ageGroup ?? null,
      inventory,
    })
  }

  return items
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Caracteres de control que invalidan el XML (vienen de descripciones del ERP)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
}

function tag(name: string, value: string): string {
  return `    <${name}>${escapeXml(value)}</${name}>`
}

export function renderMetaCatalogXml(items: readonly MetaCatalogItem[], siteUrl: string): string {
  const entries = items.map((item) => {
    const lines = [
      tag("g:id", item.id),
      tag("g:title", item.title),
      tag("g:description", item.description),
      tag("g:availability", item.availability),
      tag("g:condition", item.condition),
      tag("g:price", item.price),
      tag("g:link", item.link),
      tag("g:image_link", item.imageLink),
      tag("g:brand", item.brand),
      tag("g:quantity_to_sell_on_facebook", String(item.inventory)),
    ]
    if (item.salePrice) lines.push(tag("g:sale_price", item.salePrice))
    if (item.productType) lines.push(tag("g:product_type", item.productType))
    if (item.gender) lines.push(tag("g:gender", item.gender))
    if (item.ageGroup) lines.push(tag("g:age_group", item.ageGroup))
    for (const extra of item.additionalImageLinks) {
      lines.push(tag("g:additional_image_link", extra))
    }
    return `  <item>\n${lines.join("\n")}\n  </item>`
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    tag("title", "One Star — Catálogo"),
    tag("link", siteUrl),
    tag("description", "Catálogo de productos de One Star para Meta"),
    ...entries,
    "</channel>",
    "</rss>",
    "",
  ].join("\n")
}

export interface MetaCatalogFeed {
  xml: string
  itemCount: number
}

/** Arma el feed completo listo para servir. */
export async function getMetaCatalogFeed(
  siteUrl: string,
  limit: number = META_CATALOG_MAX_ITEMS,
): Promise<MetaCatalogFeed> {
  const products = await findMetaCatalogProducts(Math.min(limit, META_CATALOG_MAX_ITEMS))
  const items = buildMetaCatalogItems(products, siteUrl)
  return { xml: renderMetaCatalogXml(items, siteUrl), itemCount: items.length }
}
