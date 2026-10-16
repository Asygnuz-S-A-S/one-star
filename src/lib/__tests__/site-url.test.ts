import { afterEach, describe, expect, it, vi } from "vitest"

import { getSiteUrl } from "@/lib/site-url"

const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL

afterEach(() => {
  if (ORIGINAL_APP_URL === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL
  } else {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL
  }
  vi.restoreAllMocks()
})

describe("getSiteUrl", () => {
  it("usa NEXT_PUBLIC_APP_URL cuando está definida", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://onestar.com.co"
    expect(getSiteUrl()).toBe("https://onestar.com.co")
  })

  it("quita las barras finales para no emitir URLs con doble barra", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://onestar.com.co///"
    expect(getSiteUrl()).toBe("https://onestar.com.co")
  })

  it("cae en localhost cuando la variable falta o está vacía", () => {
    process.env.NEXT_PUBLIC_APP_URL = "   "
    expect(getSiteUrl()).toBe("http://localhost:3000")

    delete process.env.NEXT_PUBLIC_APP_URL
    expect(getSiteUrl()).toBe("http://localhost:3000")
  })
})
