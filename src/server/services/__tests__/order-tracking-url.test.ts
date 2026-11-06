import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { orderTrackingUrl } from "../order.service"

describe("orderTrackingUrl", () => {
  it("arma el enlace de Envía con la guía limpia", () => {
    expect(orderTrackingUrl({ trackingNumber: " 123 456 ", carrier: "ENVIA" })).toBe("https://envia.co/rastreo?guia=123%20456")
  })

  it("sin transportadora usa Envía, que es la de la tienda", () => {
    expect(orderTrackingUrl({ trackingNumber: "999", carrier: null })).toBe("https://envia.co/rastreo?guia=999")
  })

  it("no inventa enlace con otra transportadora ni sin guía", () => {
    expect(orderTrackingUrl({ trackingNumber: "999", carrier: "OTHER" })).toBeNull()
    expect(orderTrackingUrl({ trackingNumber: "  ", carrier: "ENVIA" })).toBeNull()
    expect(orderTrackingUrl({ trackingNumber: null })).toBeNull()
  })
})
