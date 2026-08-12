import { describe, test, expect } from "vitest"
import { detectColorFromText } from "../color-detect"

const PALETTE = [
  "Negro",
  "Blanco",
  "Gris",
  "Rojo",
  "Azul",
  "Azul Marino",
  "Verde",
  "Café",
  "Multicolor",
]

describe("detectColorFromText", () => {
  describe("descripciones reales del catálogo", () => {
    test("detecta el color al final de la descripción detallada", () => {
      expect(
        detectColorFromText("CONVERSE CHUCK TAYLOR LOW TOP BLANCO CLASSIC 4 BLANCO", PALETTE)
      ).toBe("Blanco")
    })

    test("detecta el color dentro del nombre del modelo", () => {
      expect(detectColorFromText("TENIS HOKA BONDI 9 NEGRO", PALETTE)).toBe("Negro")
    })

    test("detecta el color en descripciones con talla y género", () => {
      expect(detectColorFromText("Tenis NewB de prueba 39 Azul Unisex", PALETTE)).toBe("Azul")
    })
  })

  describe("variaciones de escritura", () => {
    test("reconoce el femenino del color", () => {
      expect(detectColorFromText("CAMISETA CONVERSE BLANCA", PALETTE)).toBe("Blanco")
      expect(detectColorFromText("CHAQUETA NEGRA TALLA M", PALETTE)).toBe("Negro")
    })

    test("es indiferente a mayúsculas y acentos", () => {
      expect(detectColorFromText("bota cafe de cuero", PALETTE)).toBe("Café")
      expect(detectColorFromText("BOTA CAFÉ DE CUERO", PALETTE)).toBe("Café")
    })
  })

  describe("desambiguación", () => {
    test("prefiere el nombre más largo ante coincidencias solapadas", () => {
      expect(detectColorFromText("TENIS RUNNING AZUL MARINO 42", PALETTE)).toBe("Azul Marino")
    })

    test("no confunde un color contenido en otra palabra", () => {
      expect(detectColorFromText("CAMISETA ROJOSCURO EDICION", PALETTE)).toBeNull()
      expect(detectColorFromText("MODELO GRISALLA PREMIUM", PALETTE)).toBeNull()
    })
  })

  describe("cuando no hay color", () => {
    test("devuelve null si la descripción no menciona ninguno", () => {
      expect(detectColorFromText("TENIS HOKA CLIFTON 10", PALETTE)).toBeNull()
    })

    test("tolera texto vacío o ausente", () => {
      expect(detectColorFromText("", PALETTE)).toBeNull()
      expect(detectColorFromText(null, PALETTE)).toBeNull()
      expect(detectColorFromText(undefined, PALETTE)).toBeNull()
    })

    test("devuelve null si la paleta está vacía", () => {
      expect(detectColorFromText("TENIS HOKA BONDI 9 NEGRO", [])).toBeNull()
    })
  })
})
