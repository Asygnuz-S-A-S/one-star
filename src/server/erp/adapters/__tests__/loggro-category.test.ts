import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { detectLoggroCategory } from "../loggro-category"

describe("detectLoggroCategory", () => {
  it("clasifica chanclas y sandalias como calzado propio", () => {
    expect(detectLoggroCategory("CHANCLAS DISCOVERY BEIGE UNISEX")).toEqual({
      slug: "chanclas-y-sandalias",
      name: "Chanclas y Sandalias",
    })
    expect(detectLoggroCategory("CONVERSE SANDALIA UNISEX TODA NEGRO")).toEqual({
      slug: "chanclas-y-sandalias",
      name: "Chanclas y Sandalias",
    })
  })

  it("clasifica accesorios vendibles sin confundir calzado, empaque u obsequios", () => {
    const accessories = [
      "GORRA NEW ERA NEYYAN ROJO",
      "MOCHILA VANS BENCHED BAG BLANCO NEGRO",
      "MALETIN DISCOVERY AZUL LONA CORDONES",
      "VANS CINTURON DE TELA NEGRO",
      "VANS CORDONES NEGRO",
      "CLASSIC CREW SOCKS MEDIAS LARGAS TODA NEGRAS",
      "RESHOEVN8R ORIGINAL CLEANING KIT",
    ]

    for (const name of accessories) {
      expect(detectLoggroCategory(name)).toEqual({
        slug: "accesorios",
        name: "Accesorios",
      })
    }

    expect(detectLoggroCategory("MEDIA BOTA CONVERSE HIGH STREET")).toBeUndefined()
    expect(detectLoggroCategory("BOLSA TELA GRIS GRANDE")).toBeUndefined()
    expect(detectLoggroCategory("MEDIAS CONVERSE OBSEQUIOS")).toBeUndefined()
    expect(detectLoggroCategory("CORDONES CONVERSE SUELTOS OBSEGUIO")).toBeUndefined()
    expect(detectLoggroCategory("TENIS INFANTIL ROSADO BOLSO")).toBeUndefined()
    expect(detectLoggroCategory("TENIS SKECHERS MUJER NEGRO SIN CORDON")).toBeUndefined()
  })
})
