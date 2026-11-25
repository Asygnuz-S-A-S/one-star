import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { TopBannerInputSchema } from "@/server/validators/top-banner.validator"

const base = {
  text: "Black Week",
  messages: [{ text: "Black Week" }],
  bgColor: "#000000",
  textColor: "#FFFFFF",
  isActive: true,
}

describe("TopBannerInputSchema.tickerSeconds", () => {
  it("usa 6 segundos por defecto", () => {
    expect(TopBannerInputSchema.parse(base).tickerSeconds).toBe(6)
  })

  it("acepta una velocidad dentro del rango", () => {
    expect(TopBannerInputSchema.parse({ ...base, tickerSeconds: 12 }).tickerSeconds).toBe(12)
  })

  it("rechaza velocidades fuera del rango o con decimales", () => {
    expect(TopBannerInputSchema.safeParse({ ...base, tickerSeconds: 2 }).success).toBe(false)
    expect(TopBannerInputSchema.safeParse({ ...base, tickerSeconds: 31 }).success).toBe(false)
    expect(TopBannerInputSchema.safeParse({ ...base, tickerSeconds: 7.5 }).success).toBe(false)
  })
})
