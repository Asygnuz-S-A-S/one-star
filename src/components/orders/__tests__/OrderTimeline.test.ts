import { describe, expect, it } from "vitest"
import { buildOrderTimeline } from "../OrderTimeline"
import { orderStatusLabel } from "@/lib/order-status"

const base = { createdAt: "2026-11-06T15:00:00.000Z", paidAt: "2026-11-06T15:05:00.000Z" }

describe("buildOrderTimeline", () => {
  it("envío a domicilio: marca hasta el paso actual y deja el resto pendiente", () => {
    const steps = buildOrderTimeline({ ...base, status: "SHIPPED", shippedAt: "2026-11-07T14:00:00.000Z" })
    expect(steps.map((s) => [s.label, s.done, s.at])).toEqual([
      ["Pedido recibido", true, base.createdAt],
      ["Pago confirmado", true, base.paidAt],
      ["Enviado", true, "2026-11-07T14:00:00.000Z"],
      ["Entregado", false, null],
    ])
  })

  it("recoger en tienda usa sus propios pasos", () => {
    const steps = buildOrderTimeline({ ...base, status: "DELIVERED", shippingAddress: { shippingMethod: "pickup" } })
    expect(steps.map((s) => s.label)).toEqual(["Pedido recibido", "Pago confirmado", "Listo para recoger", "Recogido en tienda"])
    expect(steps.every((s) => s.done)).toBe(true)
  })

  it("un pedido cancelado corta la línea en «Cancelado»", () => {
    const steps = buildOrderTimeline({ createdAt: base.createdAt, status: "CANCELLED" })
    expect(steps.map((s) => s.label)).toEqual(["Pedido recibido", "Cancelado"])
  })

  it("un pedido viejo ya enviado queda hecho aunque no tenga la hora", () => {
    const steps = buildOrderTimeline({ ...base, status: "SHIPPED" })
    expect(steps[2]).toMatchObject({ done: true, at: null })
  })
})

describe("orderStatusLabel", () => {
  it("cambia «Enviado» y «Entregado» en recoger en tienda", () => {
    expect(orderStatusLabel("SHIPPED", true)).toBe("Listo para recoger")
    expect(orderStatusLabel("DELIVERED", true)).toBe("Recogido")
    expect(orderStatusLabel("SHIPPED")).toBe("Enviado")
    expect(orderStatusLabel("PAID", true)).toBe("Pagado · por despachar")
  })
})
