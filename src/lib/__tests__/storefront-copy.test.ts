import { describe, expect, it } from "vitest"
import { parseBottomNav, parseClubBenefits, parseFooterLinks, parseGiftCardAmounts } from "@/lib/storefront-copy"

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

describe("parseBottomNav", () => {
  it("acepta la bolsa como botón y rechaza enlaces externos", () => {
    expect(parseBottomNav("Inicio | / | home\nBolsa | #bolsa | bag\nMal | https://evil.test | shop")).toEqual([
      { label: "Inicio", href: "/", icon: "home" },
      { label: "Bolsa", href: "#bolsa", icon: "bag" },
    ])
  })
})

describe("parseGiftCardAmounts", () => {
  it("lee montos enteros sin repetirlos", () => {
    expect(parseGiftCardAmounts("100000\nabc\n100000, 200000")).toEqual([100000, 200000])
  })
})
