import { describe, expect, it } from "vitest"

import { getGenderFilterLabel, resolveGenderFilter } from "../gender-filter"

describe("resolveGenderFilter", () => {
  it("hombre y mujer incluyen unisex, como las secciones del menú", () => {
    expect(resolveGenderFilter("hombre")).toEqual(["HOMBRE", "UNISEX"])
    expect(resolveGenderFilter("mujer")).toEqual(["MUJER", "UNISEX"])
  })

  it("niños agrupa todos los géneros infantiles", () => {
    expect(resolveGenderFilter("ninos")).toEqual(["NINO", "NINA", "INFANTIL", "BEBE"])
  })

  it("unisex devuelve solo unisex", () => {
    expect(resolveGenderFilter("unisex")).toEqual(["UNISEX"])
  })

  it("no distingue mayúsculas y acepta valores del enum sin opción propia", () => {
    expect(resolveGenderFilter("HOMBRE")).toEqual(["HOMBRE", "UNISEX"])
    expect(resolveGenderFilter("Mujer")).toEqual(["MUJER", "UNISEX"])
    expect(resolveGenderFilter("nina")).toEqual(["NINA"])
    expect(resolveGenderFilter("BEBE")).toEqual(["BEBE"])
  })

  it("ignora valores vacíos o desconocidos", () => {
    expect(resolveGenderFilter(undefined)).toBeNull()
    expect(resolveGenderFilter("")).toBeNull()
    expect(resolveGenderFilter("  ")).toBeNull()
    expect(resolveGenderFilter("robots")).toBeNull()
  })
})

describe("getGenderFilterLabel", () => {
  it("devuelve la etiqueta legible de la opción", () => {
    expect(getGenderFilterLabel("ninos")).toBe("Niños")
    expect(getGenderFilterLabel("MUJER")).toBe("Mujer")
  })

  it("devuelve null para valores desconocidos", () => {
    expect(getGenderFilterLabel("robots")).toBeNull()
    expect(getGenderFilterLabel(undefined)).toBeNull()
  })
})
