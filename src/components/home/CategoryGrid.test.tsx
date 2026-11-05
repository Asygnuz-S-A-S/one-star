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
        config={{ version: 1, kind: "collectionTile", tileStyle: "product", tiles: [{ id: "sale", media: { src: "/sale.jpg", alt: "Ofertas One Star" } }] }}
      />
    )

    expect(html).toContain('href="/sale"')
    expect(html).toContain('alt="Ofertas One Star"')
    expect(html).toContain('data-testid="collection-tile-media"')
    expect(html).toContain('class="home-scroll-reveal"')
  })

  it("muestra el arte gráfico por defecto y no la foto del producto", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid blocks={[{ ...blocks[0], id: "coleccion", href: "/productos" }, blocks[0]]} config={{ version: 1, kind: "collectionTile", tiles: [{ id: "sale", media: { src: "/sale.jpg", alt: "Ofertas One Star" } }] }} />
    )

    expect(html).not.toContain('data-testid="collection-tile-media"')
    expect(html).toContain("/brands/vans.svg")
    expect(html).toContain("SALE ★")
    expect(html).toContain('href="/sale"')
  })

  it("con imagen completa el banner propio cubre la tarjeta y reemplaza el arte", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid blocks={blocks} config={{ version: 1, kind: "collectionTile", tileStyle: "banner", tiles: [{ id: "sale", media: { src: "/banner-sale.jpg", alt: "Black Friday" } }] }} />
    )

    expect(html).toContain('data-testid="collection-tile-banner"')
    expect(html).toContain('alt="Black Friday"')
    expect(html).not.toContain("SALE ★")
  })

  it("con imagen completa pero sin imagen cae al arte gráfico", () => {
    const html = renderToStaticMarkup(<CategoryGrid blocks={blocks} config={{ version: 1, kind: "collectionTile", tileStyle: "banner", tiles: [{ id: "sale" }] }} />)

    expect(html).not.toContain('data-testid="collection-tile-banner"')
    expect(html).toContain("/brands/vans.svg")
  })

  it("usa el texto grande y el color de fondo que se eligen en el admin", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid blocks={blocks} config={{ version: 1, kind: "collectionTile", tiles: [{ id: "sale", artText: "-30%", background: "#F2C200" }] }} />
    )

    expect(html).toContain(">-30%</span>")
    expect(html).toContain('style="background-color:#F2C200"')
    expect(html).not.toContain("SALE ★")
    expect(html).toContain("text-[#1C1C1C]")
  })

  it("descarta un color de fondo que no es hex", () => {
    const html = renderToStaticMarkup(
      <CategoryGrid blocks={blocks} config={{ version: 1, kind: "collectionTile", tiles: [{ id: "sale", background: "url(javascript:alert(1))" }] }} />
    )

    expect(html).not.toContain('style="background-color')
  })

  it("renders a labelled stable placeholder when no managed media exists", () => {
    const html = renderToStaticMarkup(<CategoryGrid blocks={blocks} config={{ version: 1, kind: "collectionTile", tileStyle: "product", tiles: [{ id: "sale" }] }} />)

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
