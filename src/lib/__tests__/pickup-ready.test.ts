import { describe, expect, it } from "vitest"
import { formatPickupReadyTime } from "../pickup-ready"

describe("formatPickupReadyTime", () => {
  it("sin plazo configurado no promete nada", () => {
    expect(formatPickupReadyTime(null, null)).toBeNull()
    expect(formatPickupReadyTime(1, null)).toBeNull()
    expect(formatPickupReadyTime(undefined, 2)).toBeNull()
  })

  it("rechaza rangos inválidos", () => {
    expect(formatPickupReadyTime(3, 1)).toBeNull()
    expect(formatPickupReadyTime(-1, 2)).toBeNull()
  })

  it("mismo día", () => {
    expect(formatPickupReadyTime(0, 0)).toBe("Listo para recoger el mismo día hábil.")
  })

  it("plazo fijo en singular y plural", () => {
    expect(formatPickupReadyTime(1, 1)).toBe("Listo para recoger en 1 día hábil.")
    expect(formatPickupReadyTime(2, 2)).toBe("Listo para recoger en 2 días hábiles.")
  })

  it("rangos", () => {
    expect(formatPickupReadyTime(0, 1)).toBe("Listo para recoger el mismo día o hasta en 1 día hábil.")
    expect(formatPickupReadyTime(1, 3)).toBe("Listo para recoger en 1 a 3 días hábiles.")
  })
})
