import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EditorialSurface, MediaFrame, PublicButton, SectionHeading } from "./public-primitives"

describe("public storefront primitives", () => {
  it("renders an internal action as a link with an accessible 44px target", () => {
    const html = renderToStaticMarkup(
      <PublicButton href="/c/accesorios">Ver accesorios</PublicButton>
    )

    expect(html).toContain('href="/c/accesorios"')
    expect(html).toContain("Ver accesorios")
    expect(html).toContain("min-h-11")
  })

  it("renders a native action when no destination is provided", () => {
    const html = renderToStaticMarkup(
      <PublicButton type="submit">Agregar al carrito</PublicButton>
    )

    expect(html).toContain('<button type="submit"')
    expect(html).toContain("Agregar al carrito")
  })

  it("keeps editorial hierarchy semantic and renders a labelled media fallback", () => {
    const html = renderToStaticMarkup(
      <EditorialSurface>
        <SectionHeading eyebrow="Novedades" title="Drops de la semana" level="h2" />
        <MediaFrame alt="" fallbackLabel="Imagen del producto próximamente" />
      </EditorialSurface>
    )

    expect(html).toContain("<h2")
    expect(html).toContain("Drops de la semana")
    expect(html).toContain('role="img"')
    expect(html).toContain('aria-label="Imagen del producto próximamente"')
  })

  it("renders supplied product media with its meaningful alternative text", () => {
    const html = renderToStaticMarkup(
      <MediaFrame src="/placeholder-product.svg" alt="Tenis One Star negros" />
    )

    expect(html).toContain('alt="Tenis One Star negros"')
    expect(html).not.toContain('aria-label="Imagen no disponible"')
  })
})
