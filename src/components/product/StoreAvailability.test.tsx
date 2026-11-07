import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/dynamic", () => ({ default: () => () => null }))

import StoreAvailability from "./StoreAvailability"

const base = { availableOnline: true, webStock: 5 }

describe("StoreAvailability", () => {
  it("sin stock por sede invita a preguntar en tienda en vez de decir no disponible", () => {
    const html = renderToStaticMarkup(<StoreAvailability {...base} availableInStores stores={[]} />)
    expect(html).toContain("Pregunta por tu talla en nuestras tiendas")
    expect(html).toContain('href="/tiendas"')
    expect(html).not.toContain("No disponible en tiendas físicas")
  })

  it("si el producto no se vende en tiendas sigue diciendo no disponible", () => {
    const html = renderToStaticMarkup(<StoreAvailability {...base} availableInStores={false} stores={[]} />)
    expect(html).toContain("No disponible en tiendas físicas")
  })
})
