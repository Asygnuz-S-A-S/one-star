import { beforeEach, describe, expect, it } from "vitest"

import robots from "@/app/robots"

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://onestar.com.co"
})

describe("robots.txt", () => {
  it("apunta al sitemap absoluto del sitio", () => {
    expect(robots().sitemap).toBe("https://onestar.com.co/sitemap.xml")
  })

  it("bloquea el panel, la API y las rutas transaccionales", () => {
    const rules = robots().rules
    const disallow = Array.isArray(rules) ? [] : (rules.disallow as string[])

    expect(disallow).toEqual(
      expect.arrayContaining(["/admin", "/api", "/buscar", "/checkout", "/cuenta"])
    )
  })

  it("permite el resto del catálogo", () => {
    const rules = robots().rules
    const allow = Array.isArray(rules) ? undefined : rules.allow

    expect(allow).toBe("/")
  })
})
