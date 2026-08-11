import { describe, expect, it } from "vitest"

import { toColombiaDateInput } from "@/lib/colombia-date"

describe("Colombia date inputs", () => {
  it("mantiene el día local al reabrir el final inclusivo de un banner", () => {
    expect(toColombiaDateInput("2024-09-01T04:59:59.999Z")).toBe("2024-08-31")
  })

  it("mantiene el día local al reabrir el inicio de un banner", () => {
    expect(toColombiaDateInput("2024-08-31T05:00:00.000Z")).toBe("2024-08-31")
  })

  it("devuelve vacío para valores ausentes o inválidos", () => {
    expect(toColombiaDateInput(null)).toBe("")
    expect(toColombiaDateInput("fecha-invalida")).toBe("")
  })
})
