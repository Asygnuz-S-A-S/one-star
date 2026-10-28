import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { checkoutSchema } from "../checkout.validator"

describe("checkoutSchema", () => {
  const validPayload = {
    email: "cliente@example.com",
    name: "Juan",
    lastName: "Pérez",
    cedula: "1020304050",
    phone: "3001234567",
    address: "Calle 10 # 20-30",
    city: "Medellín",
    department: "Antioquia",
    shippingMethod: "standard" as const,
    paymentMethod: "epayco" as const,
    termsAccepted: true as const,
    items: [
      {
        productId: "prod-1",
        variantId: "var-1",
        sku: "VN000D83BLA-085",
        name: "Vans Super Lowpro",
        quantity: 1,
      },
    ],
  }

  it("acepta un payload de checkout con cédula colombiana válida (6 a 12 dígitos)", () => {
    const result = checkoutSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cedula).toBe("1020304050")
    }
  })

  it("normaliza espacios en la cédula", () => {
    const result = checkoutSchema.safeParse({
      ...validPayload,
      cedula: " 1020 304 050 ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cedula).toBe("1020304050")
    }
  })

  it("rechaza cédula con menos de 6 dígitos", () => {
    const result = checkoutSchema.safeParse({
      ...validPayload,
      cedula: "12345",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/cédula|documento/i)
    }
  })

  it("rechaza cédula con más de 12 dígitos", () => {
    const result = checkoutSchema.safeParse({
      ...validPayload,
      cedula: "1234567890123",
    })
    expect(result.success).toBe(false)
  })

  it("asigna CC por defecto a documentType si no se envía", () => {
    const result = checkoutSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.documentType).toBe("CC")
    }
  })

  it("acepta tipos de documento válidos (CE, NIT, PP)", () => {
    for (const docType of ["CE", "NIT", "PP"] as const) {
      const result = checkoutSchema.safeParse({ ...validPayload, documentType: docType })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.documentType).toBe(docType)
      }
    }
  })

  it("rechaza tipo de documento inválido", () => {
    const result = checkoutSchema.safeParse({ ...validPayload, documentType: "INVALID" })
    expect(result.success).toBe(false)
  })

  it("rechaza si termsAccepted no está presente o es false", () => {
    const withoutTerms = { ...validPayload }
    delete (withoutTerms as Record<string, unknown>).termsAccepted
    const resultMissing = checkoutSchema.safeParse(withoutTerms)
    expect(resultMissing.success).toBe(false)

    const resultFalse = checkoutSchema.safeParse({ ...validPayload, termsAccepted: false })
    expect(resultFalse.success).toBe(false)
  })
})
