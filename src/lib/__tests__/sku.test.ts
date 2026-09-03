import { describe, test, expect } from "vitest"
import { parseSku, DEFAULT_SIZE } from "../sku"

describe("parseSku", () => {
  describe("formato MODELO-COLOR_TALLA (catálogo de calzado)", () => {
    test("agrupa por modelo y color, y extrae la talla tras el guion bajo", () => {
      expect(parseSku("1162011-BWHT_10")).toEqual({ baseSku: "1162011-BWHT", size: "10" })
    })

    test("conserva las tallas decimales", () => {
      expect(parseSku("1155111-MVR_10.5")).toEqual({ baseSku: "1155111-MVR", size: "10.5" })
    })

    test("separa dos colores del mismo modelo en productos distintos", () => {
      const negro = parseSku("1162011-BWHT_9")
      const gris = parseSku("1162011-GCTC_9")
      expect(negro.baseSku).not.toBe(gris.baseSku)
      expect(negro.size).toBe(gris.size)
    })

    test("soporta tallas no numéricas", () => {
      expect(parseSku("10018568-0A2_U")).toEqual({ baseSku: "10018568-0A2", size: "U" })
    })
  })

  describe("formato MODELO-TALLA", () => {
    test("usa el primer guion como separador", () => {
      expect(parseSku("NB574AZ-38")).toEqual({ baseSku: "NB574AZ", size: "38" })
    })

    test("mantiene el resto del código como talla", () => {
      expect(parseSku("M7652-3.5")).toEqual({ baseSku: "M7652", size: "3.5" })
    })
  })

  describe("productos sin variantes", () => {
    test("un código sin separadores queda como talla única", () => {
      expect(parseSku("ZAPATO")).toEqual({ baseSku: "ZAPATO", size: DEFAULT_SIZE })
    })

    test("un guion final no genera una talla vacía", () => {
      expect(parseSku("M7652-")).toEqual({ baseSku: "M7652-", size: DEFAULT_SIZE })
    })

    test("un guion bajo final no genera una talla vacía", () => {
      expect(parseSku("1162011-BWHT_")).toEqual({ baseSku: "1162011-BWHT", size: DEFAULT_SIZE })
    })

    test("ignora los espacios alrededor del código", () => {
      expect(parseSku("  NB574AZ-38  ")).toEqual({ baseSku: "NB574AZ", size: "38" })
    })
  })
})
