import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MetaCatalogProductRow } from "@/server/repositories/meta-catalog.repository"

vi.mock("server-only", () => ({}))

const findMetaCatalogProducts = vi.fn()

vi.mock("@/server/repositories/meta-catalog.repository", () => ({
  findMetaCatalogProducts: (...args: unknown[]) => findMetaCatalogProducts(...args),
}))

const {
  buildMetaCatalogItems,
  escapeXml,
  formatMetaPrice,
  getMetaCatalogFeed,
  renderMetaCatalogXml,
} = await import("../meta-catalog.service")

const SITE = "https://tiendaonestar.com"

function makeProduct(overrides: Partial<Record<string, unknown>> = {}): MetaCatalogProductRow {
  return {
    id: "prod-1",
    slug: "tenis-one-star",
    name: "Tenis One Star",
    description: "Tenis cómodos para el día a día",
    basePrice: 250_000,
    isOnSale: false,
    salePrice: null,
    gender: "MUJER",
    brand: { name: "Converse" },
    category: { name: "Tenis" },
    images: [{ url: "/img/tenis-1.jpg" }, { url: "/img/tenis-2.jpg" }],
    variants: [{ stock: 3 }, { stock: 2 }],
    ...overrides,
  } as unknown as MetaCatalogProductRow
}

beforeEach(() => {
  findMetaCatalogProducts.mockReset()
})

describe("formatMetaPrice", () => {
  it("usa pesos sin decimales y con la moneda, como exige Meta", () => {
    expect(formatMetaPrice(250_000)).toBe("250000 COP")
    expect(formatMetaPrice(99_999.6)).toBe("100000 COP")
  })
})

describe("buildMetaCatalogItems", () => {
  it("usa el Product.id como id del item, el mismo que el píxel manda en content_ids", () => {
    const [item] = buildMetaCatalogItems([makeProduct({ id: "abc-123" })], SITE)

    // Si esto cambia, Meta deja de emparejar los eventos con el catálogo.
    expect(item.id).toBe("abc-123")
  })

  it("arma el item completo con enlaces absolutos", () => {
    const [item] = buildMetaCatalogItems([makeProduct()], SITE)

    expect(item).toMatchObject({
      title: "Tenis One Star",
      description: "Tenis cómodos para el día a día",
      availability: "in stock",
      condition: "new",
      price: "250000 COP",
      salePrice: null,
      link: "https://tiendaonestar.com/productos/tenis-one-star",
      imageLink: "https://tiendaonestar.com/img/tenis-1.jpg",
      additionalImageLinks: ["https://tiendaonestar.com/img/tenis-2.jpg"],
      brand: "Converse",
      productType: "Tenis",
      gender: "female",
      ageGroup: "adult",
      inventory: 5,
    })
  })

  it("respeta las imágenes que ya son absolutas (Cloudinary)", () => {
    const [item] = buildMetaCatalogItems(
      [makeProduct({ images: [{ url: "https://res.cloudinary.com/x/foto.jpg" }] })],
      SITE,
    )

    expect(item.imageLink).toBe("https://res.cloudinary.com/x/foto.jpg")
  })

  it("marca out of stock cuando ninguna variante tiene existencias", () => {
    const [item] = buildMetaCatalogItems(
      [makeProduct({ variants: [{ stock: 0 }, { stock: 0 }] })],
      SITE,
    )

    expect(item.availability).toBe("out of stock")
    expect(item.inventory).toBe(0)
  })

  it("ignora stock negativo del ERP en lugar de restar", () => {
    const [item] = buildMetaCatalogItems([makeProduct({ variants: [{ stock: -4 }, { stock: 2 }] })], SITE)

    expect(item.inventory).toBe(2)
  })

  it("incluye sale_price solo cuando hay promoción real", () => {
    const [conPromo] = buildMetaCatalogItems(
      [makeProduct({ isOnSale: true, salePrice: 180_000 })],
      SITE,
    )
    const [sinPromo] = buildMetaCatalogItems(
      [makeProduct({ isOnSale: false, salePrice: 180_000 })],
      SITE,
    )
    const [promoInvalida] = buildMetaCatalogItems(
      [makeProduct({ isOnSale: true, salePrice: 300_000 })],
      SITE,
    )

    expect(conPromo.salePrice).toBe("180000 COP")
    expect(sinPromo.salePrice).toBeNull()
    expect(promoInvalida.salePrice).toBeNull()
  })

  it("descarta productos sin imagen o sin precio válido", () => {
    const items = buildMetaCatalogItems(
      [makeProduct({ images: [] }), makeProduct({ id: "p-2", basePrice: 0 })],
      SITE,
    )

    expect(items).toHaveLength(0)
  })

  it("traduce el género del catálogo al vocabulario de Meta", () => {
    const [nino] = buildMetaCatalogItems([makeProduct({ gender: "NINO" })], SITE)
    const [unisex] = buildMetaCatalogItems([makeProduct({ gender: "UNISEX" })], SITE)
    const [sinGenero] = buildMetaCatalogItems([makeProduct({ gender: null })], SITE)

    expect(nino).toMatchObject({ gender: "male", ageGroup: "kids" })
    expect(unisex).toMatchObject({ gender: "unisex", ageGroup: "adult" })
    expect(sinGenero).toMatchObject({ gender: null, ageGroup: null })
  })

  it("cae a marca y descripción por defecto cuando faltan", () => {
    const [item] = buildMetaCatalogItems(
      [makeProduct({ brand: null, description: null })],
      SITE,
    )

    expect(item.brand).toBe("One Star")
    expect(item.description).toBe("Tenis One Star")
  })
})

describe("escapeXml", () => {
  it("escapa lo que rompería el feed", () => {
    expect(escapeXml('Camiseta "A&B" <nueva>')).toBe(
      "Camiseta &quot;A&amp;B&quot; &lt;nueva&gt;",
    )
  })

  it("quita caracteres de control que invalidan el XML", () => {
    expect(escapeXml("Tenis\u0007 negros")).toBe("Tenis negros")
  })
})

describe("renderMetaCatalogXml", () => {
  it("genera un RSS válido con el namespace que Meta espera", () => {
    const xml = renderMetaCatalogXml(buildMetaCatalogItems([makeProduct()], SITE), SITE)

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"')
    expect(xml).toContain("<g:id>prod-1</g:id>")
    expect(xml).toContain("<g:price>250000 COP</g:price>")
    expect(xml).toContain("<g:availability>in stock</g:availability>")
    expect(xml).toContain("<g:quantity_to_sell_on_facebook>5</g:quantity_to_sell_on_facebook>")
    expect(xml).toContain("</rss>")
  })

  it("omite las etiquetas opcionales que no aplican", () => {
    const xml = renderMetaCatalogXml(
      buildMetaCatalogItems([makeProduct({ isOnSale: false, gender: null, category: null })], SITE),
      SITE,
    )

    expect(xml).not.toContain("<g:sale_price>")
    expect(xml).not.toContain("<g:gender>")
    expect(xml).not.toContain("<g:product_type>")
  })

  it("escapa el contenido de cada producto", () => {
    const xml = renderMetaCatalogXml(
      buildMetaCatalogItems([makeProduct({ name: "Tenis A&B" })], SITE),
      SITE,
    )

    expect(xml).toContain("<g:title>Tenis A&amp;B</g:title>")
  })

  it("genera XML sintácticamente válido", async () => {
    const { execSync } = await import("node:child_process")
    const complexProducts = [
      makeProduct({ id: "p1", name: 'Tenis "Speed" & Fast <Edition>' }),
      makeProduct({ id: "p2", isOnSale: true, salePrice: 150_000, description: "Con & comercial y 'comillas'" }),
      makeProduct({ id: "p3", variants: [{ stock: 0 }] }),
    ]
    const xml = renderMetaCatalogXml(buildMetaCatalogItems(complexProducts, SITE), SITE)

    let hasXmllint = false
    try {
      execSync("which xmllint", { stdio: "ignore" })
      hasXmllint = true
    } catch {}

    if (hasXmllint) {
      expect(() => {
        execSync("xmllint --noout -", { input: xml, stdio: ["pipe", "pipe", "pipe"] })
      }).not.toThrow()
    }

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    const openTags = (xml.match(/<([a-zA-Z0-9_:-]+)(?:\s+[^>]*)?>/g) || []).map((t) => t.match(/<([a-zA-Z0-9_:-]+)/)![1])
    const closeTags = (xml.match(/<\/([a-zA-Z0-9_:-]+)>/g) || []).map((t) => t.match(/<\/([a-zA-Z0-9_:-]+)>/)![1])
    expect(openTags.sort()).toEqual(closeTags.sort())
  })
})

describe("getMetaCatalogFeed", () => {
  it("devuelve el XML y cuántos items quedaron", async () => {
    findMetaCatalogProducts.mockResolvedValue([makeProduct(), makeProduct({ id: "prod-2" })])

    const feed = await getMetaCatalogFeed(SITE)

    expect(feed.itemCount).toBe(2)
    expect(feed.xml).toContain("<g:id>prod-2</g:id>")
  })

  it("nunca pide más del tope, aunque se lo pidan por query", async () => {
    findMetaCatalogProducts.mockResolvedValue([])

    await getMetaCatalogFeed(SITE, 999_999)

    expect(findMetaCatalogProducts).toHaveBeenCalledWith(5000)
  })

  it("entrega un feed vacío válido si no hay productos", async () => {
    findMetaCatalogProducts.mockResolvedValue([])

    const feed = await getMetaCatalogFeed(SITE)

    expect(feed.itemCount).toBe(0)
    expect(feed.xml).toContain("<channel>")
    expect(feed.xml).not.toContain("<item>")
  })
})
