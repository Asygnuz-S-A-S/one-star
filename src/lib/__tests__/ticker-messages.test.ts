import { describe, expect, it } from "vitest"

import { normalizeTickerMessages, reorderTickerMessages } from "@/lib/ticker-messages"

describe("ticker message ordering", () => {
  it("mueve mensajes sin modificar el arreglo original", () => {
    const original = [
      { text: "Primero", url: "/uno" },
      { text: "Segundo", url: "/dos" },
    ]

    const reordered = reorderTickerMessages(original, 1, -1)

    expect(reordered.map(message => message.text)).toEqual(["Segundo", "Primero"])
    expect(original.map(message => message.text)).toEqual(["Primero", "Segundo"])
  })

  it("ignora movimientos fuera de los límites", () => {
    const messages = [{ text: "Único" }]
    expect(reorderTickerMessages(messages, 0, -1)).toBe(messages)
    expect(reorderTickerMessages(messages, 0, 1)).toBe(messages)
  })
})

describe("ticker message normalization", () => {
  it("descarta valores heredados inválidos sin tumbar el header", () => {
    expect(normalizeTickerMessages({ text: "no es un arreglo" })).toEqual([])
    expect(normalizeTickerMessages([null, { text: "" }, { text: "Oferta", url: "/sale" }]))
      .toEqual([{ text: "Oferta", url: "/sale" }])
  })
})
