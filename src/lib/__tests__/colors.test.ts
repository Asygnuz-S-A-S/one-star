import { describe, expect, test } from "vitest"
import { getColorHexes } from "../colors"

describe("getColorHexes", () => {
  test("encuentra un color de la paleta ignorando mayúsculas y acentos", () => {
    expect(getColorHexes("cafe", { Café: "#6D4C41" })).toEqual(["#6D4C41"])
  })
})
