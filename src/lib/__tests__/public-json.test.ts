import { describe, expect, it } from "vitest"
import { stripInternalFields } from "../public-json"

describe("stripInternalFields", () => {
  it("quita erpId en cualquier nivel y deja el resto", () => {
    const out = stripInternalFields({ id: "p", erpId: "X", variants: [{ sku: "s", inventory: [{ storeLocation: { name: "T", erpId: "Y" } }] }] })
    expect(out).toEqual({ id: "p", variants: [{ sku: "s", inventory: [{ storeLocation: { name: "T" } }] }] })
  })
})
