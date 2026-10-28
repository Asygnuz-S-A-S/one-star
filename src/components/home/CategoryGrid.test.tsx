import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import CategoryGrid from "./CategoryGrid"

const blocks = [{
  id: "sale",
  label: "Sale",
  href: "/sale",
  bgColor: "bg-black",
  emoji: null,
  darkText: false,
  position: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}]

describe("CategoryGrid editorial tiles", () => {
  it("keeps the existing destination and renders configured managed media", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid
        blocks={blocks}
        config={{ version: 1, kind: "collectionTile", tiles: [{ id: "sale", media: { src: "/sale.jpg", alt: "Ofertas One Star" } }] }}
      />
    )

    expect(html).toContain('href="/sale"')
    expect(html).toContain('alt="Ofertas One Star"')
    expect(html).toContain('data-testid="collection-tile-media"')
    expect(html).toContain('class="home-scroll-reveal"')
  })

  it("renders a labelled stable placeholder when no managed media exists", () => {
    const html = renderToStaticMarkup(<CategoryGrid blocks={blocks} />)

    expect(html).toContain('data-testid="collection-tile-fallback"')
    expect(html).toContain('aria-label="Imagen de Sale próximamente"')
  })
})

  it("uses the semantic title and internal destination when a tile overrides a collection", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid
        blocks={blocks}
        config={{ version: 1, kind: "collectionTile", tiles: [{ id: "sale", title: "Ofertas", href: "/productos", appearance: "oneStarRed" }] }}
      />
    )

    expect(html).toContain('href="/productos"')
    expect(html).toContain(">Ofertas</span>")
  })
