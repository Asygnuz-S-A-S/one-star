import { describe, expect, it } from "vitest"

import { formatLegalDate, hasPendingCompanyData, LEGAL_COMPANY } from "@/lib/legal"

describe("datos legales de la empresa", () => {
  it("marca los datos como pendientes mientras falte identificación obligatoria", () => {
    expect(hasPendingCompanyData(LEGAL_COMPANY)).toBe(true)
  })

  it("deja de marcarlos como pendientes cuando el cliente los confirma", () => {
    expect(
      hasPendingCompanyData({
        tradeName: "One Star",
        legalName: "One Star S.A.S.",
        taxId: "900.000.000-1",
        address: "Cra. 50 #50-20, Medellín",
        contactEmail: "contacto@onestar.com.co",
        contactPhone: null,
      })
    ).toBe(false)
  })

  it("formatea la fecha de vigencia en español sin desfase de zona horaria", () => {
    expect(formatLegalDate("2026-09-03")).toBe("3 de septiembre de 2026")
  })
})
