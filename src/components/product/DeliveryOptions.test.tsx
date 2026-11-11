import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import DeliveryOptions from "./DeliveryOptions"

const base = {
  price: 429_900,
  freeThreshold: 299_900,
  delivery: { min: 3, max: 5 },
  pickupStores: [{ id: "s1", name: "One Star Fundadores", city: "Manizales" }],
  availableInStores: true,
  storeStockText: "Disponible en cualquiera de nuestras tiendas.",
}

describe("DeliveryOptions", () => {
  it("muestra despacho con los días y el envío gratis de Configuración", () => {
    const html = renderToStaticMarkup(<DeliveryOptions {...base} />)
    expect(html).toContain("Despacho a domicilio")
    expect(html).toContain("Llega en 3 a 5 días hábiles · Envío gratis")
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain("<details")
    expect(renderToStaticMarkup(<DeliveryOptions {...base} price={100_000} />)).toContain("Gratis desde $")
  })

  it("ofrece retirar en tienda solo si hay tiendas para recoger", () => {
    expect(renderToStaticMarkup(<DeliveryOptions {...base} />)).toContain("One Star Fundadores")
    expect(renderToStaticMarkup(<DeliveryOptions {...base} pickupStores={[]} />)).not.toContain("Retira en tienda")
  })

  it("stock en tienda muestra el texto del admin sin nombrar una sede", () => {
    const html = renderToStaticMarkup(<DeliveryOptions {...base} storeStockText="En todas nuestras tiendas." />)
    expect(html).toContain("Stock en tienda")
    expect(html).toContain("En todas nuestras tiendas.")
    expect(html).toContain('href="/tiendas"')
  })

  it("sin venta en tiendas no muestra la fila de stock en tienda", () => {
    expect(renderToStaticMarkup(<DeliveryOptions {...base} availableInStores={false} />)).not.toContain("Stock en tienda")
  })
})
