import { describe, expect, it } from "vitest"
import { getProductAvailability } from "./product-availability"

describe("getProductAvailability", () => {
  it("identifies a purchasable online product", () => {
    expect(getProductAvailability(true, true)).toEqual({
      label: "Disponible en línea",
      detail: "Elige talla y agrégalo al carrito.",
      tone: "available",
    })
  })

  it("keeps a store-only product explicit even when it has stock", () => {
    expect(getProductAvailability(false, true)).toEqual({
      label: "Solo disponible en tiendas físicas",
      detail: "Consulta existencias en tienda.",
      tone: "store-only",
    })
  })

  it("does not promise online availability when every variant is sold out", () => {
    expect(getProductAvailability(true, false)).toEqual({
      label: "Agotado en línea",
      detail: "Revisa otras tallas o colores.",
      tone: "sold-out",
    })
  })
})
