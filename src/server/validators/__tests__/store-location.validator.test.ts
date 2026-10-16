import { describe, expect, it } from "vitest"

import { storeLocationSchema } from "../store-location.validator"

describe("storeLocationSchema", () => {
  const base = { name: "One Star Centro", address: "Cra 50 # 50-20", city: "Medellín", isActive: true }

  it("convierte el vínculo ERP vacío en null y conserva uno válido", () => {
    expect(storeLocationSchema.parse({ ...base, erpId: "" }).erpId).toBeNull()
    expect(storeLocationSchema.parse({ ...base, erpId: null }).erpId).toBeNull()
    expect(storeLocationSchema.parse({ ...base, erpId: "  est-1 " }).erpId).toBe("est-1")
  })

  it("deja fuera los campos que el formulario no envía, para no borrarlos al guardar", () => {
    const parsed = storeLocationSchema.parse(base)

    expect(parsed.googleMapsUrl).toBeUndefined()
    expect(parsed.erpId).toBeUndefined()
    expect("googleMapsUrl" in parsed).toBe(false)
  })

  it("rechaza sedes sin ciudad", () => {
    const result = storeLocationSchema.safeParse({ ...base, city: "" })
    expect(result.success).toBe(false)
  })
})
