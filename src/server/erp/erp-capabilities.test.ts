import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { supportsCatalogSync } from "./erp-capabilities"

describe("supportsCatalogSync", () => {
  it("devuelve false cuando el adaptador no implementa fetchCatalog", () => {
    expect(supportsCatalogSync({ ping: vi.fn() } as never)).toBe(false)
  })

  it("devuelve true cuando fetchCatalog es una función, sin consultar ping", () => {
    const ping = vi.fn()

    expect(supportsCatalogSync({ fetchCatalog: vi.fn(), ping } as never)).toBe(true)
    expect(ping).not.toHaveBeenCalled()
  })
})
