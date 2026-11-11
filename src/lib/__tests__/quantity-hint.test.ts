import { describe, expect, it } from "vitest"
import { getQuantityHint } from "../quantity-hint"

describe("getQuantityHint", () => {
  it("sin talla no dice nada (el botón ya pide la talla)", () => {
    expect(getQuantityHint({ hasSize: false, available: 0, inCart: 0, quantity: 1 })).toBeNull()
  })

  it("avisa que es el último par", () => {
    expect(getQuantityHint({ hasSize: true, available: 1, inCart: 0, quantity: 1 })).toEqual({
      tone: "limit",
      text: "Solo queda 1 par en esta talla.",
    })
  })

  it("en el tope cuenta lo que ya está en el carrito", () => {
    expect(getQuantityHint({ hasSize: true, available: 2, inCart: 1, quantity: 2 })?.text).toBe(
      "Solo quedan 2 pares más en esta talla (ya tienes 1 en el carrito)."
    )
  })

  it("si ya están todas en el carrito lo dice", () => {
    expect(getQuantityHint({ hasSize: true, available: 0, inCart: 3, quantity: 1 })?.tone).toBe("limit")
  })

  it("con stock de sobra solo informa lo que hay en el carrito", () => {
    expect(getQuantityHint({ hasSize: true, available: 5, inCart: 0, quantity: 1 })).toBeNull()
    expect(getQuantityHint({ hasSize: true, available: 5, inCart: 2, quantity: 1 })).toEqual({
      tone: "info",
      text: "Ya tienes 2 de esta talla en el carrito.",
    })
  })
})
