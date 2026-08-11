import { describe, expect, it } from "vitest"

import { canUseNextImageOptimization } from "@/lib/image-optimization"

describe("Next Image optimization", () => {
  it("optimiza imágenes locales y hosts declarados en remotePatterns", () => {
    expect(canUseNextImageOptimization("/uploads/banner.jpg")).toBe(true)
    expect(canUseNextImageOptimization("https://res.cloudinary.com/demo/banner.jpg")).toBe(true)
  })

  it("deja sin optimizar hosts administrables no configurados", () => {
    expect(canUseNextImageOptimization("https://cdn.example.com/banner.jpg")).toBe(false)
    expect(canUseNextImageOptimization("https://res.cloudinary.com:444/banner.jpg")).toBe(false)
  })
})
