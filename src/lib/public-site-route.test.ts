import { describe, expect, it } from "vitest"

import { isAdminPathname } from "./public-site-route"

describe("isAdminPathname", () => {
  it("reconoce la raíz administrativa", () => {
    expect(isAdminPathname("/admin")).toBe(true)
  })

  it("reconoce las subrutas administrativas", () => {
    expect(isAdminPathname("/admin/login")).toBe(true)
  })

  it("respeta el límite exacto del segmento admin", () => {
    expect(isAdminPathname("/admin/")).toBe(true)
    expect(isAdminPathname("/admin/productos/nuevo")).toBe(true)
    expect(isAdminPathname("/administrar")).toBe(false)
    expect(isAdminPathname("/administer")).toBe(false)
    expect(isAdminPathname("/productos")).toBe(false)
  })
})
