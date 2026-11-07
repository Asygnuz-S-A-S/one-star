import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import BrandStrip from "./BrandStrip"

const brands = [{ name: "Hoka", slug: "hoka" }, { name: "Vans", slug: "vans" }]

describe("BrandStrip", () => {
  it("con estilo burbujas muestra cada marca una vez y enlaza a su página", () => {
    const html = renderToStaticMarkup(<BrandStrip brands={brands} config={{ style: "bubbles", title: "Compra por marca" }} />)
    expect(html).toContain('data-testid="brand-bubbles"')
    expect(html).toContain("Compra por marca")
    expect(html.match(/href="\/marcas\/hoka"/g)).toHaveLength(1)
    expect(html).toContain('href="/marcas/vans"')
  })

  it("sin estilo sigue siendo la franja en movimiento", () => {
    const html = renderToStaticMarkup(<BrandStrip brands={brands} config={{}} />)
    expect(html).not.toContain('data-testid="brand-bubbles"')
    expect(html).toContain("Carrusel de marcas destacadas")
  })
})
