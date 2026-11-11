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
})
