import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import StoreAvailability from "./StoreAvailability"

const base = {
  availableOnline: true,
  webStock: 5,
  storeText: "Disponible en cualquiera de nuestras tiendas.",
  stores: [{ id: "s1", name: "One Star Fundadores", city: "Manizales" }],
}

describe("StoreAvailability", () => {
  it("muestra el texto de tiendas del admin, las sedes y el enlace a tiendas", () => {
    const html = renderToStaticMarkup(<StoreAvailability {...base} availableInStores />)
    expect(html).toContain("Disponible en cualquiera de nuestras tiendas.")
    expect(html).toContain("One Star Fundadores · Manizales")
    expect(html).toContain('href="/tiendas"')
    expect(html).toContain("Envío a todo Colombia")
  })

  it("si no se vende en tiendas no muestra la columna de tienda", () => {
    const html = renderToStaticMarkup(<StoreAvailability {...base} availableInStores={false} />)
    expect(html).not.toContain("En tienda")
    expect(html).toContain("En línea")
  })

  it("si no está ni en línea ni en tienda no pinta nada", () => {
    expect(renderToStaticMarkup(<StoreAvailability {...base} webStock={0} availableInStores={false} />)).toBe("")
  })
})
