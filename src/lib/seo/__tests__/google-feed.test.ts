import { describe, expect, it } from "vitest"
import { buildGoogleFeedXml, type FeedProduct } from "@/lib/seo/google-feed"

const base: FeedProduct = {
  id: "p1",
  slug: "hoka-bondi-9",
  name: "Bondi 9",
  brand: "HOKA",
  description: "Amortiguación máxima & suela <reforzada>",
  metaTitle: null,
  metaDescription: null,
  basePrice: 999000,
  salePrice: 799000,
  isOnSale: true,
  gender: "HOMBRE",
  category: { name: "Running", slug: "running" },
  images: [{ url: "https://cdn.test/1.jpg" }, { url: "/2.jpg" }],
  variants: [{ sku: "HK-9-42", color: "Negro", stock: 2 }],
}

const feed = (products: FeedProduct[]) => buildGoogleFeedXml(products, "https://onestar.test", "One Star")

describe("feed de Google Merchant Center", () => {
  it("arma un ítem válido con precio, oferta, stock, marca y fotos absolutas", () => {
    const xml = feed([base])
    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')
    expect(xml).toContain("<g:id>p1</g:id>")
    expect(xml).toContain("<g:title>HOKA Bondi 9</g:title>")
    expect(xml).toContain("<g:link>https://onestar.test/productos/hoka-bondi-9</g:link>")
    expect(xml).toContain("<g:price>999000.00 COP</g:price>")
    expect(xml).toContain("<g:sale_price>799000.00 COP</g:sale_price>")
    expect(xml).toContain("<g:availability>in_stock</g:availability>")
    expect(xml).toContain("<g:additional_image_link>https://onestar.test/2.jpg</g:additional_image_link>")
    expect(xml).toContain("<g:gender>male</g:gender><g:age_group>adult</g:age_group>")
    expect(xml).toContain("Amortiguación máxima &amp; suela &lt;reforzada&gt;")
  })

  it("deja fuera productos sin foto y tarjetas de regalo", () => {
    const xml = feed([{ ...base, id: "sin-foto", images: [] }, { ...base, id: "gift", variants: [{ sku: "GIFT-CARD-50", color: "N/A", stock: 9 }] }])
    expect(xml).not.toContain("<item>")
  })

  it("sin marca real usa identifier_exists=no y sin oferta no manda sale_price", () => {
    const xml = feed([{ ...base, brand: "Sin marca", isOnSale: false, variants: [{ sku: "X", color: "N/A", stock: 0 }] }])
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>")
    expect(xml).not.toContain("<g:brand>")
    expect(xml).not.toContain("<g:sale_price>")
    expect(xml).not.toContain("<g:color>")
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>")
  })
})
