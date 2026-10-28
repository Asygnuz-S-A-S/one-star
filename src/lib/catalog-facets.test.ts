import { describe, expect, it } from "vitest"

import { compareSizes, dedupeColors } from "./catalog-facets"

describe("compareSizes", () => {
  it("ordena numéricas, luego infantiles, luego letras y al final el resto", () => {
    const sizes = ["10", "6.5", "U", "M", "7I", "5", "Única", "S", "12J", "9.5", "36"]
    expect([...sizes].sort(compareSizes)).toEqual(["5", "6.5", "9.5", "10", "36", "7I", "12J", "S", "M", "U", "Única"])
  })
})

describe("dedupeColors", () => {
  it("une el mismo color escrito en distintas mayúsculas", () => {
    expect(dedupeColors(["AZUL", "Azul", "Blanco/Negro", "BLANCO"])).toEqual(["AZUL", "BLANCO", "Blanco/Negro"])
  })
})
