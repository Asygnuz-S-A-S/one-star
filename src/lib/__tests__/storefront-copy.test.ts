import { describe, expect, it } from "vitest"
import { parseClubBenefits, parseFooterLinks } from "@/lib/storefront-copy"

describe("parseClubBenefits", () => {
  it("usa los beneficios de respaldo si el texto está vacío", () => {
    expect(parseClubBenefits("")).toHaveLength(3)
    expect(parseClubBenefits(null)[0].title).toBe("Promociones exclusivas")
  })

  it("lee título y detalle separados por una barra", () => {
    expect(parseClubBenefits("Envíos | Gratis desde cierto monto")).toEqual([
      { title: "Envíos", detail: "Gratis desde cierto monto" },
    ])
  })
})

describe("parseFooterLinks", () => {
  it("rechaza rutas que no son internas", () => {
    expect(parseFooterLinks("Externo | https://evil.test\nTienda | /productos")).toEqual([
      { label: "Tienda", href: "/productos" },
    ])
  })

  it("usa los enlaces de respaldo si no queda ninguno válido", () => {
    expect(parseFooterLinks("Mal | //otro").length).toBeGreaterThan(1)
  })
})
