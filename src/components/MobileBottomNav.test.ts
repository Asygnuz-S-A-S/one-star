import { describe, expect, it } from "vitest"

import { shouldShowMobileBottomNav } from "@/components/MobileBottomNav"

describe("shouldShowMobileBottomNav", () => {
  it("se muestra en home, catálogo y cuenta", () => {
    expect(shouldShowMobileBottomNav("/")).toBe(true)
    expect(shouldShowMobileBottomNav("/productos")).toBe(true)
    expect(shouldShowMobileBottomNav("/cuenta")).toBe(true)
  })

  it("se oculta donde hay barra de compra propia", () => {
    expect(shouldShowMobileBottomNav("/productos/VN0009QCNWD")).toBe(false)
    expect(shouldShowMobileBottomNav("/checkout")).toBe(false)
    expect(shouldShowMobileBottomNav("/carrito")).toBe(false)
  })
})
