import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { detectLoggroGender } from "../loggro-gender"

describe("detectLoggroGender", () => {
  it("detecta HOMBRE como una palabra completa", () => {
    expect(detectLoggroGender("TENIS ON CLOUD 6 HOMBRE NEGRO")).toBe("HOMBRE")
    expect(detectLoggroGender("SOMBRERO NEGRO")).toBeUndefined()
  })

  it("normaliza MUJER y el alias DAMA", () => {
    expect(detectLoggroGender("TENIS SKECHERS MUJER VERDE")).toBe("MUJER")
    expect(detectLoggroGender("SKECEHRS ZAPATILLA DAMA BEIGE")).toBe("MUJER")
  })

  it("prioriza UNISEX y no adivina textos contradictorios", () => {
    expect(detectLoggroGender("TENIS HOMBRE MUJER UNISEX BLANCO")).toBe("UNISEX")
    expect(detectLoggroGender("TENIS HOMBRE MUJER BLANCO")).toBeUndefined()
  })

  it("normaliza las señales infantiles explícitas", () => {
    expect(detectLoggroGender("TENIS BOUNDLESS GRIS NIÑA")).toBe("NINA")
    expect(detectLoggroGender("TENIS AZUL NIÑOS")).toBe("NINO")
    expect(detectLoggroGender("ZAPATILLA INFANTIL ROSADA")).toBe("INFANTIL")
    expect(detectLoggroGender("TENIS JUNIOR BLANCO")).toBe("INFANTIL")
    expect(detectLoggroGender("ZAPATO BEBÉ AZUL")).toBe("BEBE")
  })
})
