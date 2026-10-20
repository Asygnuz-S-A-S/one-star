import { describe, it, expect } from "vitest"
import { resolveBrandLogoUrl } from "../brand-logos"

describe("resolveBrandLogoUrl", () => {
  it("conserva logoUrl si la marca ya cuenta con uno", () => {
    const result = resolveBrandLogoUrl({
      name: "Converse",
      slug: "converse",
      logoUrl: "https://res.cloudinary.com/custom/converse.png",
    })
    expect(result).toBe("https://res.cloudinary.com/custom/converse.png")
  })

  it("resuelve logo oficial por slug para marcas conocidas", () => {
    expect(resolveBrandLogoUrl({ name: "Converse", slug: "converse" })).toBe("/brands/converse.svg")
    expect(resolveBrandLogoUrl({ name: "Vans", slug: "vans" })).toBe("/brands/vans.svg")
    expect(resolveBrandLogoUrl({ name: "Hoka", slug: "hoka" })).toBe("/brands/hoka.svg")
    expect(resolveBrandLogoUrl({ name: "Columbia", slug: "columbia" })).toBe("/brands/columbia.svg")
    expect(resolveBrandLogoUrl({ name: "Skechers", slug: "skechers" })).toBe("/brands/skechers.svg")
    expect(resolveBrandLogoUrl({ name: "Discovery", slug: "discovery" })).toBe("/brands/discovery.svg")
    expect(resolveBrandLogoUrl({ name: "Reshoevn8r", slug: "reshoevn8r" })).toBe("/brands/reshoevn8r.svg")
    expect(resolveBrandLogoUrl({ name: "Sin Marca", slug: "sin-marca" })).toBe("/brands/sin-marca.svg")
    expect(resolveBrandLogoUrl({ name: "Nike", slug: "nike" })).toBe("/brands/nike.svg")
    expect(resolveBrandLogoUrl({ name: "Adidas", slug: "adidas" })).toBe("/brands/adidas.svg")
    expect(resolveBrandLogoUrl({ name: "Puma", slug: "puma" })).toBe("/brands/puma.svg")
    expect(resolveBrandLogoUrl({ name: "New Balance", slug: "new-balance" })).toBe("/brands/new-balance.svg")
    expect(resolveBrandLogoUrl({ name: "On", slug: "on" })).toBe("/brands/on.svg")
  })

  it("resuelve por nombre si el slug no coincide o está vacío", () => {
    expect(resolveBrandLogoUrl({ name: "New Balance" })).toBe("/brands/new-balance.svg")
    expect(resolveBrandLogoUrl({ name: "On Running" })).toBe("/brands/on.svg")
  })

  it("soporta strings directamente", () => {
    expect(resolveBrandLogoUrl("Nike")).toBe("/brands/nike.svg")
    expect(resolveBrandLogoUrl("Converse")).toBe("/brands/converse.svg")
  })

  it("devuelve null para marcas desconocidas sin logo", () => {
    expect(resolveBrandLogoUrl({ name: "Marca Desconocida", slug: "marca-desconocida" })).toBeNull()
    expect(resolveBrandLogoUrl(null)).toBeNull()
    expect(resolveBrandLogoUrl(undefined)).toBeNull()
  })
})
