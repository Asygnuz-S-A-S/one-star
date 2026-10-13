import { describe, it, expect } from "vitest"
import { buildBrandMetadata, buildBrandJsonLd, buildBrandTitle, buildBrandDescription } from "../brand-seo"

describe("brand-seo", () => {
  const mockBrand = {
    name: "Nike",
    slug: "nike",
    description: "Zapatillas y ropa deportiva Nike originales.",
    metaTitle: "Nike Colombia | Tienda Oficial One Star",
    metaDescription: "Compra zapatillas Nike originales con envío a todo Colombia.",
    logoUrl: "https://res.cloudinary.com/demo/image/upload/nike-logo.png",
    bannerUrl: "https://res.cloudinary.com/demo/image/upload/nike-banner.png",
    faqs: [
      { q: "¿Nike talla normal?", a: "Por lo general sí, pero recomendamos verificar la guía de tallas." },
    ],
  }

  const mockCtx = {
    siteUrl: "https://onestar.test",
    storeName: "One Star",
    products: [
      { name: "Nike Air Force 1", slug: "nike-air-force-1", imageUrl: "/images/af1.jpg" },
      { name: "Nike Dunk Low", slug: "nike-dunk-low", imageUrl: "/images/dunk.jpg" },
    ],
  }

  it("genera títulos y descripciones respetando overrides o fallbacks", () => {
    expect(buildBrandTitle(mockBrand, "One Star")).toBe("Nike Colombia | Tienda Oficial One Star")
    expect(buildBrandDescription(mockBrand, "One Star")).toBe(mockBrand.metaDescription)

    const fallbackTitle = buildBrandTitle({ name: "Adidas", slug: "adidas", faqs: [] }, "One Star")
    expect(fallbackTitle).toContain("Adidas")
    expect(fallbackTitle).toContain("One Star")
  })

  it("genera metadata de Next.js con canonical y OpenGraph", () => {
    const meta = buildBrandMetadata(mockBrand, mockCtx)
    expect(meta.title).toEqual({ absolute: "Nike Colombia | Tienda Oficial One Star" })
    expect(meta.alternates?.canonical).toBe("https://onestar.test/marcas/nike")
    expect(meta.openGraph?.url).toBe("https://onestar.test/marcas/nike")
  })

  it("genera JSON-LD estructurado sin aggregateRating ni reviews", () => {
    const jsonLd = buildBrandJsonLd(mockBrand, mockCtx)
    expect(jsonLd["@context"]).toBe("https://schema.org")
    const graph = jsonLd["@graph"] as Array<Record<string, unknown>>
    expect(Array.isArray(graph)).toBe(true)

    // Verify types present
    const types = graph.map((node) => node["@type"])
    expect(types).toContain("Brand")
    expect(types).toContain("CollectionPage")
    expect(types).toContain("BreadcrumbList")
    expect(types).toContain("FAQPage")

    // Verify NO aggregateRating or Review
    const brandNode = graph.find((node) => node["@type"] === "Brand")
    expect(brandNode).toBeDefined()
    expect(brandNode?.aggregateRating).toBeUndefined()
    expect(brandNode?.review).toBeUndefined()

    // Verify CollectionPage ItemList
    const collectionNode = graph.find((node) => node["@type"] === "CollectionPage") as Record<string, unknown>
    const mainEntity = collectionNode.mainEntity as Record<string, unknown>
    expect(mainEntity["@type"]).toBe("ItemList")
    const items = mainEntity.itemListElement as Array<Record<string, unknown>>
    expect(items.length).toBe(2)
    expect(items[0].url).toBe("https://onestar.test/productos/nike-air-force-1")
  })
})
