import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { detectLoggroBrand } from "../loggro-brand"

describe("detectLoggroBrand", () => {
  it("prioriza la marca explícita del nombre cuando el código Loggro es mixto", () => {
    expect(
      detectLoggroBrand("008", "CAMISETA COLUMBIA TEMPORADA LOGO AZUL HOMBRE")
    ).toEqual({ slug: "columbia", name: "Columbia" })
  })

  it("mapea los códigos estables auditados a marcas canónicas", () => {
    expect([
      detectLoggroBrand("001", "BOTA CHUCK TAYLOR 70S VERDE"),
      detectLoggroBrand("002", "TENIS NIKE JOURNEY RUN"),
      detectLoggroBrand("003", "TENIS VANS AUTHENTIC"),
      detectLoggroBrand("004", "TENIS SKECHERES NIÑOS"),
      detectLoggroBrand("005", "TENIS NEW BLANCE 9060"),
      detectLoggroBrand("006", "TENIS ON CLOUD 6"),
      detectLoggroBrand("007", "TENIS HOKA BONDI 9"),
      detectLoggroBrand("009", "MALETIN DISCOVERY"),
      detectLoggroBrand("010", "CLASSIC CREW SOCKS"),
      detectLoggroBrand("012", "GORRA NEW ERA"),
      detectLoggroBrand("013", "CHANCLAS DISCOVERY"),
    ]).toEqual([
      { slug: "converse", name: "Converse" },
      { slug: "nike", name: "Nike" },
      { slug: "vans", name: "Vans" },
      { slug: "skechers", name: "Skechers" },
      { slug: "new-balance", name: "New Balance" },
      { slug: "on", name: "On" },
      { slug: "hoka", name: "Hoka" },
      { slug: "discovery", name: "Discovery" },
      { slug: "vans", name: "Vans" },
      { slug: "new-era", name: "New Era" },
      { slug: "discovery", name: "Discovery" },
    ])
  })

  it("separa las marcas mezcladas en 008 y usa Sin marca solo para mercancía sin fabricante", () => {
    expect([
      detectLoggroBrand("008", "CAMISETA CONVERSE NEGRA LOGO COLORES"),
      detectLoggroBrand("008", "RESHOEVN8R ORIGINAL CLEANING KIT"),
      detectLoggroBrand("008", "PAQUETE COMPLETO DE FILAMENTA OBSEQUIO"),
      detectLoggroBrand("011", "BOLSA TELA GRIS GRANDE"),
      detectLoggroBrand("999", "PRODUCTO SIN SEÑAL"),
    ]).toEqual([
      { slug: "converse", name: "Converse" },
      { slug: "reshoevn8r", name: "Reshoevn8r" },
      { slug: "sin-marca", name: "Sin marca" },
      { slug: "sin-marca", name: "Sin marca" },
      undefined,
    ])
  })

  it("reconoce marcas explícitas aunque el código cambie o venga equivocado", () => {
    expect([
      detectLoggroBrand("999", "TENIS NIKE JOURNEY RUN"),
      detectLoggroBrand("999", "TENIS VANS AUTHENTIC"),
      detectLoggroBrand("999", "TENIS SKECEHRS MUJER"),
      detectLoggroBrand("999", "TENIS SKECHERES NIÑOS"),
      detectLoggroBrand("999", "TENIS NEW BLANCE 9060"),
      detectLoggroBrand("999", "TENIS ON CLOUDVISTA 2"),
      detectLoggroBrand("999", "TENIS HOKA BONDI 9"),
      detectLoggroBrand("999", "GORRA NEW ERA NEYYAN"),
      detectLoggroBrand("999", "CHANCLAS DISCOVERY VERDES"),
    ]).toEqual([
      { slug: "nike", name: "Nike" },
      { slug: "vans", name: "Vans" },
      { slug: "skechers", name: "Skechers" },
      { slug: "skechers", name: "Skechers" },
      { slug: "new-balance", name: "New Balance" },
      { slug: "on", name: "On" },
      { slug: "hoka", name: "Hoka" },
      { slug: "new-era", name: "New Era" },
      { slug: "discovery", name: "Discovery" },
    ])
  })
})
