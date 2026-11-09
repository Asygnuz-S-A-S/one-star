import { readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { RESERVED_LANDING_SLUGS, isReservedLandingSlug, landingPath } from "@/lib/landing-paths"

describe("rutas de landings", () => {
  it("toda carpeta de ruta en src/app está reservada (una landing no la puede tapar)", () => {
    const appDir = path.join(process.cwd(), "src/app")
    const routes = readdirSync(appDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !/^[([_]/.test(entry.name) && entry.name !== "__tests__")
      .map((entry) => entry.name)
    expect(routes.filter((route) => !RESERVED_LANDING_SLUGS.has(route))).toEqual([])
  })

  it("la URL pública va en la raíz y el inicio es /", () => {
    expect(landingPath("home")).toBe("/")
    expect(landingPath("black-friday")).toBe("/black-friday")
    expect(isReservedLandingSlug("checkout")).toBe(true)
    expect(isReservedLandingSlug("black-friday")).toBe(false)
  })
})
