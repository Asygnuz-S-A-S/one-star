import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import DeliveryOptions from "./DeliveryOptions"

const base = {
  price: 429_900,
  freeThreshold: 299_900,
  delivery: { min: 3, max: 5 },
  pickupStores: [{ id: "s1", name: "One Star Fundadores", city: "Manizales" }],
  availableInStores: true,
  selectedSize: "",
  storeStock: [],
  hasStoreBreakdown: false,
}

describe("DeliveryOptions", () => {
  it("muestra despacho con los días y el envío gratis de Configuración", () => {
    const html = renderToStaticMarkup(<DeliveryOptions {...base} />)
    expect(html).toContain("Despacho a domicilio")
    expect(html).toContain("Llega en 3 a 5 días hábiles · Envío gratis")
    expect(renderToStaticMarkup(<DeliveryOptions {...base} price={100_000} />)).toContain("Gratis desde $")
  })

  it("ofrece retirar en tienda solo si hay tiendas para recoger", () => {
    expect(renderToStaticMarkup(<DeliveryOptions {...base} />)).toContain("One Star Fundadores")
    expect(renderToStaticMarkup(<DeliveryOptions {...base} pickupStores={[]} />)).not.toContain("Retira en tienda")
  })

  it("stock en tienda: pide talla, lista por sede o invita a preguntar", () => {
    expect(renderToStaticMarkup(<DeliveryOptions {...base} />)).toContain("Elige una talla para ver disponibilidad")
    const withBreakdown = renderToStaticMarkup(
      <DeliveryOptions {...base} selectedSize="9" hasStoreBreakdown storeStock={[{ id: "s1", name: "Fundadores", city: "Manizales", stock: 2 }]} />
    )
    expect(withBreakdown).toContain("Fundadores")
    expect(withBreakdown).toContain("2 disponibles")
    expect(renderToStaticMarkup(<DeliveryOptions {...base} selectedSize="9" />)).toContain("Pregunta por la talla 9")
  })

  it("sin venta en tiendas no muestra la fila de stock en tienda", () => {
    expect(renderToStaticMarkup(<DeliveryOptions {...base} availableInStores={false} />)).not.toContain("Stock en tienda")
  })
})
