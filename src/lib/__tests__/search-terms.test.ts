import { describe, expect, it } from "vitest"
import { searchTerms } from "../search-terms"

describe("searchTerms", () => {
  it("parte varias palabras y recorta plurales", () => {
    expect(searchTerms("Converse  Negros")).toEqual(["converse", "negro"])
    expect(searchTerms("tenis negros")).toEqual(["teni", "negro"])
  })
  it("ignora letras sueltas, duplicados y vacíos", () => {
    expect(searchTerms(" a hoka hoka ")).toEqual(["hoka"])
    expect(searchTerms("   ")).toEqual([])
  })
})
