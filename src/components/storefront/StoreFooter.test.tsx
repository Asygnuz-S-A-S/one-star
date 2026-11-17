import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/legal/CookiePreferencesButton", () => ({ default: () => null }))

import StoreFooter from "./StoreFooter"

describe("StoreFooter", () => {
  it("usa el logo de «Logos Grandes / Footer» cuando hay uno principal", () => {
    const html = renderToStaticMarkup(<StoreFooter logoUrl="https://res.cloudinary.com/demo/logo-footer.svg" />)
    expect(html).toContain("logo-footer.svg")
    expect(html).toContain('alt="One Star"')
    expect(html).not.toContain(">ONE STAR<")
  })

  it("sin logo muestra el nombre de la tienda en texto", () => {
    expect(renderToStaticMarkup(<StoreFooter />)).toContain(">ONE STAR<")
  })

  it("agrupa los enlaces en una columna de tienda y otra legal, con los nombres nuevos", () => {
    const html = renderToStaticMarkup(<StoreFooter />)
    const legalStart = html.indexOf("Información legal")
    expect(html.indexOf(">Tienda<")).toBeLessThan(legalStart)
    for (const label of ["Política de datos", "Condiciones de envíos y devoluciones", "Términos y condiciones", ">PQRS<"]) {
      expect(html.indexOf(label)).toBeGreaterThan(legalStart)
    }
    for (const label of ["Tarjeta de regalo", ">Sale<", "One Star Club", ">Tiendas<"]) {
      const index = html.indexOf(label)
      expect(index).toBeGreaterThan(-1)
      expect(index).toBeLessThan(legalStart)
    }
    expect(html).not.toContain(">Privacidad<")
  })
})
