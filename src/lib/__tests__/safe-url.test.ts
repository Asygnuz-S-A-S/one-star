import { describe, expect, it } from "vitest"

import { isSafePublicUrl, safePublicUrl } from "@/lib/safe-url"

describe("safe public URLs", () => {
  it.each([
    "/colecciones/nuevas",
    "/buscar?q=zapatos#resultados",
    "https://example.com/oferta",
    "http://localhost:3000/prueba",
  ])("acepta rutas relativas y URLs web: %s", (url) => {
    expect(isSafePublicUrl(url)).toBe(true)
  })

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example/path",
    "/ruta\\maliciosa",
    "mailto:ventas@example.com",
  ])("rechaza destinos ejecutables o ambiguos: %s", (url) => {
    expect(isSafePublicUrl(url)).toBe(false)
  })

  it("sustituye datos heredados inseguros al renderizar", () => {
    expect(safePublicUrl("javascript:alert(1)", "/")).toBe("/")
  })
})
