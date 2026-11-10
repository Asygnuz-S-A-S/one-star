import { describe, expect, it } from "vitest"
import { buildProductLandingSections, type ProductLandingSource } from "../product-landing"

const product: ProductLandingSource = {
  slug: "hoka-clifton-9-negro",
  name: "Hoka Clifton 9",
  brand: "HOKA",
  basePrice: 650000,
  isOnSale: true,
  salePrice: 520000,
  description: "Amortiguación ligera\npara correr todos los días.",
  extendedDescription: null,
  metaDescription: null,
  highlights: ["Suela <b>Meta-Rocker</b>"],
  faqs: [{ q: "¿Talla normal?", a: "Sí, horma regular." }],
  images: [{ url: "https://res.cloudinary.com/x/clifton.jpg", alt: "" }],
  colorSiblings: [{ slug: "hoka-clifton-9-blanco" }],
}

describe("buildProductLandingSections", () => {
  it("arma portada, vitrina con colores, detalles y relacionados", () => {
    const sections = buildProductLandingSections(product, ["otro-1", "otro-2"])

    expect(sections.map((section) => section.type)).toEqual(["HERO", "PRODUCT_CAROUSEL", "CUSTOM_HTML", "PRODUCT_CAROUSEL"])
    const slide = (sections[0].config.slides as Record<string, unknown>[])[0]
    expect(slide).toMatchObject({
      eyebrow: "HOKA",
      headline: "Hoka Clifton 9",
      primaryCta: { label: "Comprar ahora", href: "/productos/hoka-clifton-9-negro" },
      foregroundMedia: { src: "https://res.cloudinary.com/x/clifton.jpg", alt: "Hoka Clifton 9" },
    })
    expect(slide.spinMode).toBeUndefined()
    expect(sections[1].config.productSlugs).toEqual(["hoka-clifton-9-negro", "hoka-clifton-9-blanco"])
    expect(sections[3].config.productSlugs).toEqual(["otro-1", "otro-2"])
  })

  it("escapa el texto del producto y usa el precio de oferta", () => {
    const html = buildProductLandingSections(product, [])[2].config.html as string

    expect(html).toContain("Suela &lt;b&gt;Meta-Rocker&lt;/b&gt;")
    expect(html).not.toContain("<b>")
    expect(html).toContain("<p>para correr todos los días.</p>")
    expect(html).toContain("¿Talla normal?")
    expect(html).toMatch(/Comprar por \$\s?520\.000/)
  })

  it("sin relacionados ni fotos no inventa secciones ni imágenes", () => {
    const sections = buildProductLandingSections({ ...product, images: [], colorSiblings: [] }, [])

    expect(sections).toHaveLength(3)
    expect((sections[0].config.slides as Record<string, unknown>[])[0].foregroundMedia).toBeUndefined()
    expect(sections[1].config.title).toBe("Elige el tuyo")
  })

  it("usa la foto sin fondo en la portada solo si se pide", () => {
    const withPhoto = { ...product, images: [{ url: "https://res.cloudinary.com/x/image/upload/v1/clifton.jpg", alt: "" }] }
    const heroSrc = (sections: ReturnType<typeof buildProductLandingSections>) =>
      (sections[0].config.slides as Record<string, { src: string }>[])[0].foregroundMedia.src

    expect(heroSrc(buildProductLandingSections(withPhoto, []))).toBe("https://res.cloudinary.com/x/image/upload/v1/clifton.jpg")
    expect(heroSrc(buildProductLandingSections(withPhoto, [], { heroCutout: true })))
      .toBe("https://res.cloudinary.com/x/image/upload/e_background_removal/e_trim/v1/clifton.jpg")
  })
})
