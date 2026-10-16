import { describe, expect, it } from "vitest"

vi.mock("server-only", () => ({}))

import { vi } from "vitest"
import {
  MetaPixelInputSchema,
  StoreInfoInputSchema,
} from "../store-settings.validator"

describe("StoreInfoInputSchema", () => {
  it("normaliza campos vacíos a null y limpia el WhatsApp", () => {
    const result = StoreInfoInputSchema.parse({
      storeName: "  One Star ",
      contactEmail: "",
      whatsapp: "+57 (300) 123-4567",
    })

    expect(result).toEqual({
      storeName: "One Star",
      contactEmail: null,
      whatsapp: "+573001234567",
    })
  })

  it("rechaza un email inválido", () => {
    const result = StoreInfoInputSchema.safeParse({
      storeName: "One Star",
      contactEmail: "no-es-email",
      whatsapp: "",
    })

    expect(result.success).toBe(false)
  })

  it("rechaza un WhatsApp con letras", () => {
    const result = StoreInfoInputSchema.safeParse({
      storeName: "One Star",
      contactEmail: "",
      whatsapp: "+57abc",
    })

    expect(result.success).toBe(false)
  })
})

describe("MetaPixelInputSchema", () => {
  const base = {
    enabled: false,
    pixelId: "",
    accessToken: "",
    clearAccessToken: false,
    testEventCode: "",
  }

  it("acepta un píxel apagado sin datos", () => {
    const result = MetaPixelInputSchema.parse(base)

    expect(result).toEqual({
      enabled: false,
      pixelId: null,
      accessToken: null,
      clearAccessToken: false,
      testEventCode: null,
    })
  })

  it("exige el ID del píxel para activarlo", () => {
    const result = MetaPixelInputSchema.safeParse({ ...base, enabled: true })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["pixelId"])
    }
  })

  it("rechaza un ID de píxel no numérico", () => {
    const result = MetaPixelInputSchema.safeParse({ ...base, pixelId: "abc123" })

    expect(result.success).toBe(false)
  })

  it("conserva el token tal cual y acepta un código de prueba", () => {
    const result = MetaPixelInputSchema.parse({
      ...base,
      enabled: true,
      pixelId: "123456789012345",
      accessToken: "EAAB-token",
      testEventCode: "TEST123",
    })

    expect(result.pixelId).toBe("123456789012345")
    expect(result.accessToken).toBe("EAAB-token")
    expect(result.testEventCode).toBe("TEST123")
  })
})
