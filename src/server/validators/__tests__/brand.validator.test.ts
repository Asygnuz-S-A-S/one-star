import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { brandInputSchema } from "../brand.validator"

describe("brandInputSchema", () => {
  it("valida y acepta campos válidos de guía de tallas", () => {
    const data = {
      name: "Converse",
      sizeGuideImageUrl: "https://res.cloudinary.com/onestar/image/upload/v123/converse-size-guide.jpg",
      sizeGuideNote: "Las Converse Chuck Taylor suelen calzar medio número más grande.",
    }

    const result = brandInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sizeGuideImageUrl).toBe(data.sizeGuideImageUrl)
      expect(result.data.sizeGuideNote).toBe(data.sizeGuideNote)
    }
  })

  it("permite sizeGuideImageUrl y sizeGuideNote nulos o indefinidos", () => {
    const data = {
      name: "Vans",
      sizeGuideImageUrl: null,
      sizeGuideNote: null,
    }

    const result = brandInputSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it("rechaza sizeGuideImageUrl de dominios no autorizados", () => {
    const data = {
      name: "Nike",
      sizeGuideImageUrl: "https://malicious-site.com/size-guide.jpg",
    }

    const result = brandInputSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("dominio permitido")
    }
  })

  it("rechaza sizeGuideNote que excede 500 caracteres", () => {
    const data = {
      name: "Puma",
      sizeGuideNote: "a".repeat(501),
    }

    const result = brandInputSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it("acepta URLs de guía de tallas específicas por género", () => {
    const data = {
      name: "Hoka",
      sizeGuideMenUrl: "https://res.cloudinary.com/onestar/image/upload/v123/hoka-men.jpg",
      sizeGuideWomenUrl: "https://res.cloudinary.com/onestar/image/upload/v123/hoka-women.jpg",
      sizeGuideKidsUrl: "https://res.cloudinary.com/onestar/image/upload/v123/hoka-kids.jpg",
    }

    const result = brandInputSchema.safeParse(data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sizeGuideMenUrl).toBe(data.sizeGuideMenUrl)
      expect(result.data.sizeGuideWomenUrl).toBe(data.sizeGuideWomenUrl)
      expect(result.data.sizeGuideKidsUrl).toBe(data.sizeGuideKidsUrl)
    }
  })
})
