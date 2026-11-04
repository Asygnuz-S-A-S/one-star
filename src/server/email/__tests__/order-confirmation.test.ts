import { describe, expect, it } from "vitest"
import { orderConfirmationEmail } from "../templates"

const base = { orderId: "order-abc12345", items: [{ productName: "Nike AF1", quantity: 1, unitPrice: 529900 }], total: 529900 }

describe("orderConfirmationEmail", () => {
  it("con recoger en tienda dice dónde recoger y escapa el nombre", () => {
    const { html } = orderConfirmationEmail({ ...base, pickupStore: { name: "One Star <Fundadores>", address: "C.C. Fundadores, Manizales" } })
    expect(html).toContain("Recoges tu pedido en <strong>One Star &lt;Fundadores&gt;</strong>")
    expect(html).toContain("C.C. Fundadores, Manizales")
    expect(html).not.toContain("despachado")
  })

  it("con envío a domicilio mantiene el aviso de despacho", () => {
    const { html } = orderConfirmationEmail(base)
    expect(html).toContain("Te avisaremos cuando tu pedido sea despachado.")
  })
})
