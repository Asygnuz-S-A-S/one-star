import { describe, expect, it } from "vitest"

import { storeLocationSchema } from "../store-location.validator"

describe("storeLocationSchema", () => {
  const base = { name: "One Star Centro", address: "Cra 50 # 50-20", city: "Medellín", isActive: true }

  it("convierte el vínculo ERP vacío en null y conserva uno válido", () => {
    expect(storeLocationSchema.parse({ ...base, erpId: "" }).erpId).toBeNull()
    expect(storeLocationSchema.parse({ ...base, erpId: "  est-1 " }).erpId).toBe("est-1")
    expect(storeLocationSchema.parse(base).erpId).toBeNull()
  })

  it("rechaza sedes sin ciudad", () => {
    const result = storeLocationSchema.safeParse({ ...base, city: "" })
    expect(result.success).toBe(false)
  })
})
