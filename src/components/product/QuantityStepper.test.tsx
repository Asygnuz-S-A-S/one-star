import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import QuantityStepper from "./QuantityStepper"

describe("QuantityStepper", () => {
  it("no deja bajar de 1 ni subir del tope de stock", () => {
    const atMin = renderToStaticMarkup(<QuantityStepper value={1} max={4} onChange={() => {}} />)
    expect(atMin).toContain("disabled")
    expect(atMin).toContain(">1<")

    const atMax = renderToStaticMarkup(<QuantityStepper value={4} max={4} onChange={() => {}} />)
    expect(atMax).toContain(">4<")
    expect(atMax.match(/disabled/g)?.length).toBeGreaterThanOrEqual(1)
  })
})

describe("QuantityStepper con aviso", () => {
  it("en el tope el «+» queda tocable para avisar por qué no sube", () => {
    const html = renderToStaticMarkup(<QuantityStepper value={2} max={2} onChange={() => {}} onBlocked={() => {}} />)
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('aria-label="Agregar una unidad"')
    // Solo el «−» está deshabilitado de verdad cuando value > 1: ninguno lo está aquí.
    expect(html.match(/ disabled=""/g)).toBeNull()
  })
})
