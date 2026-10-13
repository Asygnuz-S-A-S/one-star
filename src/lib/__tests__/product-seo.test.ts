import { describe, expect, it } from "vitest"
import {
  buildProductDescription,
  buildProductJsonLd,
  buildProductMetadata,
  buildProductTitle,
  serializeJsonLd,
  truncateAtWord,
  type SeoContext,
  type SeoProduct,
} from "@/lib/seo/product-seo"

type Node = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const product: SeoProduct = {
  name: "Air Zoom Pegasus 41",
  slug: "air-zoom-pegasus-41",
  brand: "Nike",
  description: null,
  metaTitle: null,
  metaDescription: null,
  category: { name: "Running", slug: "running" },
  images: [{ url: "https://cdn.test/a.jpg" }, { url: "/local.jpg", alt: "Vista lateral" }],
  variants: [
    { sku: "NK-1-40", color: "Negro", stock: 3 },
    { sku: "NK-1-41", color: "N/A", stock: 0 },
  ],
  basePrice: 480000,
  salePrice: 399000,
  isOnSale: true,
  faqs: [{ q: "¿Talla normal?", a: "Sí, talla normal." }],
}

const ctx: SeoContext = {
  siteUrl: "https://onestar.test",
  storeName: "One Star",
  reviews: [
    { userName: "Ana", rating: 5, title: "Perfectos", body: "Muy cómodos", createdAt: "2026-09-01T10:00:00Z" },
  ],
  reviewStats: { avg: 5, count: 1 },
  now: new Date("2026-10-05T00:00:00Z"),
}

describe("título y descripción", () => {
  it("compone nombre + marca + tienda sin pasarse de 60 caracteres", () => {
    const title = buildProductTitle(product, "One Star")
    expect(title).toBe("Air Zoom Pegasus 41 Nike | Comprar en Colombia - One Star")
    expect(title.length).toBeLessThanOrEqual(60)
  })

  it("respeta el meta título del admin", () => {
    expect(buildProductTitle({ ...product, metaTitle: "Título manual" }, "One Star")).toBe("Título manual")
  })

  it("recorta nombres largos en límite de palabra", () => {
    const long = { ...product, brand: null, name: "Zapatilla de running ultra liviana con amortiguación reactiva y suela de carbono" }
    const title = buildProductTitle(long, "One Star")
    expect(title.length).toBeLessThanOrEqual(60)
    expect(title.endsWith("| One Star")).toBe(true)
  })

  it("genera una descripción con precio vigente cuando el producto no trae una", () => {
    const description = buildProductDescription(product, "One Star")
    expect(description).toContain("Air Zoom Pegasus 41")
    expect(description).toContain("399.000")
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it("truncateAtWord no corta palabras", () => {
    expect(truncateAtWord("uno dos tres cuatro cinco", 14)).toBe("uno dos tres…")
  })
})

describe("metadata", () => {
  it("fija canonical limpio, absolutiza imágenes y expone el precio", () => {
    const meta = buildProductMetadata(product, ctx)
    expect(meta.alternates?.canonical).toBe("https://onestar.test/productos/air-zoom-pegasus-41")
    const images = meta.openGraph?.images as { url: string }[]
    expect(images[1].url).toBe("https://onestar.test/local.jpg")
    expect(meta.other?.["product:price:amount"]).toBe("399000")
  })
})

describe("JSON-LD", () => {
  const graph = (buildProductJsonLd(product, ctx)["@graph"] as Record<string, unknown>[])
  const node = graph.find((n) => n["@type"] === "Product") as Node

  it("incluye Product, BreadcrumbList y FAQPage", () => {
    expect(graph.map((n) => n["@type"])).toEqual(["Product", "BreadcrumbList", "FAQPage"])
  })

  it("declara oferta con disponibilidad, envío y devoluciones reales", () => {
    expect(node.offers.price).toBe("399000")
    expect(node.offers.availability).toBe("https://schema.org/InStock")
    expect(node.offers.priceValidUntil).toBe("2027-10-05")
    expect(node.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(30)
    expect(node.offers.shippingDetails.shippingRate.value).toBe(0)
  })

  it("solo anota colores reales y el SKU de la primera variante", () => {
    expect(node.color).toBe("Negro")
    expect(node.sku).toBe("NK-1-40")
  })

  it("agrega aggregateRating y reseñas solo si hay reseñas aprobadas", () => {
    expect(node.aggregateRating.reviewCount).toBe(1)
    expect(node.review[0].author.name).toBe("Ana")
    const sinResenas = buildProductJsonLd(product, { ...ctx, reviews: [], reviewStats: { avg: 0, count: 0 } })
    const n2 = (sinResenas["@graph"] as Node[])[0]
    expect(n2.aggregateRating).toBeUndefined()
    expect(n2.review).toBeUndefined()
  })

  it("marca agotado cuando no queda stock", () => {
    const agotado = buildProductJsonLd({ ...product, variants: [{ sku: "X", color: "Negro", stock: 0 }] }, ctx)
    const n = (agotado["@graph"] as Node[])[0]
    expect(n.offers.availability).toBe("https://schema.org/OutOfStock")
  })

  it("serializa sin permitir cerrar el script", () => {
    expect(serializeJsonLd({ a: "</script><script>x" })).not.toContain("</script>")
  })
})
