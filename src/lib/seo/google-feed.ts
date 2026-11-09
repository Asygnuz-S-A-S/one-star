import { isRealColor } from "@/lib/colors"
import { GIFT_CARD_SKU_PREFIX } from "@/lib/gift-card"
import { absoluteUrl, buildProductDescription, buildProductUrl, seoBrand, truncateAtWord } from "@/lib/seo/product-seo"

/**
 * Feed de productos para Google Merchant Center (fichas gratuitas en Shopping e Imágenes).
 * Formato RSS 2.0 con el espacio de nombres `g:`; especificación:
 * https://support.google.com/merchants/answer/7052112
 */

export interface FeedProduct {
  id: string
  slug: string
  name: string
  brand: string | null
  description: string | null
  metaTitle: string | null
  metaDescription: string | null
  basePrice: number
  salePrice: number | null
  isOnSale: boolean
  gender: string | null
  category: { name: string; slug: string }
  images: { url: string }[]
  variants: { sku: string; color: string; stock: number }[]
}

// Taxonomía de Google: 187 = Apparel & Accessories > Shoes; 167 = Clothing Accessories.
const SHOES_CATEGORY = "187"
const ACCESSORIES_CATEGORY = "167"

const GOOGLE_GENDER: Record<string, string> = { HOMBRE: "male", MUJER: "female", UNISEX: "unisex" }
const KIDS = new Set(["NINO", "NINA", "INFANTIL", "BEBE"])

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Caracteres de control que invalidan el XML.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
}

const money = (value: number) => `${value.toFixed(2)} COP`

function itemXml(product: FeedProduct, siteUrl: string, storeName: string): string | null {
  // Sin foto Google rechaza el producto; las tarjetas de regalo no son producto físico.
  if (product.images.length === 0) return null
  if (product.variants.some((v) => v.sku.startsWith(GIFT_CARD_SKU_PREFIX))) return null

  const brand = seoBrand(product.brand)
  const inStock = product.variants.some((v) => v.stock > 0)
  const color = product.variants.map((v) => v.color).find(isRealColor)
  const gender = product.gender ? GOOGLE_GENDER[product.gender] ?? (KIDS.has(product.gender) ? "unisex" : undefined) : undefined
  const title = brand && !product.name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${product.name}` : product.name
  const onSale = product.isOnSale && product.salePrice !== null && product.salePrice < product.basePrice
  const images = product.images.map((image) => absoluteUrl(image.url, siteUrl))

  const fields: [string, string][] = [
    ["g:id", product.id],
    ["g:title", truncateAtWord(title, 150)],
    ["g:description", truncateAtWord(product.description?.trim() || buildProductDescription({ ...product, faqs: [] }, storeName), 5000)],
    ["g:link", buildProductUrl(product.slug, siteUrl)],
    ["g:image_link", images[0]],
    ...images.slice(1, 11).map((url): [string, string] => ["g:additional_image_link", url]),
    ["g:availability", inStock ? "in_stock" : "out_of_stock"],
    ["g:price", money(product.basePrice)],
    ...(onSale ? [["g:sale_price", money(product.salePrice!)] as [string, string]] : []),
    ["g:condition", "new"],
    ["g:google_product_category", product.category.slug === "accesorios" ? ACCESSORIES_CATEGORY : SHOES_CATEGORY],
    ["g:product_type", product.category.name],
    ...(brand ? [["g:brand", brand] as [string, string]] : [["g:identifier_exists", "no"] as [string, string]]),
    ...(color ? [["g:color", color] as [string, string]] : []),
    ...(gender ? [["g:gender", gender] as [string, string]] : []),
    ...(product.gender ? [["g:age_group", KIDS.has(product.gender) ? "kids" : "adult"] as [string, string]] : []),
  ]
  return `<item>${fields.map(([tag, value]) => `<${tag}>${esc(value)}</${tag}>`).join("")}</item>`
}

export function buildGoogleFeedXml(products: FeedProduct[], siteUrl: string, storeName: string): string {
  const items = products.map((p) => itemXml(p, siteUrl, storeName)).filter((x): x is string => x !== null)
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
    `<title>${esc(storeName)}</title><link>${esc(siteUrl)}</link>` +
    `<description>${esc(`Catálogo de ${storeName}`)}</description>` +
    items.join("") +
    `</channel></rss>`
  )
}
