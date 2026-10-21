import { describe, expect, it } from "vitest"

import { EXPRESS_SHIPPING_COST, STANDARD_SHIPPING_COST, STANDARD_SHIPPING_THRESHOLD } from "../shipping"
import { STORE_KNOWLEDGE } from "../store-knowledge"

const cop = (value: number) => `$${value.toLocaleString("es-CO")}`

describe("STORE_KNOWLEDGE", () => {
  it("usa los mismos valores de envío que cobra el checkout", () => {
    expect(STORE_KNOWLEDGE).toContain(`Envío estándar: ${cop(STANDARD_SHIPPING_COST)}`)
    expect(STORE_KNOWLEDGE).toContain(`gratis en compras desde ${cop(STANDARD_SHIPPING_THRESHOLD)}`)
    expect(STORE_KNOWLEDGE).toContain(`Envío express: ${cop(EXPRESS_SHIPPING_COST)}`)
  })

  it("formatea los precios con puntos de miles", () => {
    expect(cop(STANDARD_SHIPPING_THRESHOLD)).toBe("$200.000")
  })

  it("incluye las políticas confirmadas por One Star", () => {
    for (const texto of ["30 días calendario", "10 días calendario", "5 días hábiles", "Pago contra entrega: por ahora no", "Pasaje Los Agustinos", "313 762 0554"]) {
      expect(STORE_KNOWLEDGE).toContain(texto)
    }
  })

  it("no deja datos pendientes de confirmar", () => {
    expect(STORE_KNOWLEDGE).not.toMatch(/por confirmar/i)
  })
})
