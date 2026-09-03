import { describe, test, expect } from "vitest"
import {
  PLACEHOLDER_IMAGE_URL,
  filterImagesByColor,
  getPrimaryImageUrl,
  normalizeColor,
} from "../product-image"

const img = (url: string, color: string | null = null) => ({ url, alt: url, color })

describe("getPrimaryImageUrl", () => {
  test("returns the first image url when the product has images", () => {
    const images = [img("https://cdn/a.jpg"), img("https://cdn/b.jpg")]

    expect(getPrimaryImageUrl(images)).toBe("https://cdn/a.jpg")
  })

  test("returns the placeholder when the product has no images", () => {
    expect(getPrimaryImageUrl([])).toBe(PLACEHOLDER_IMAGE_URL)
  })

  test("returns the placeholder when images are null or undefined", () => {
    expect(getPrimaryImageUrl(null)).toBe(PLACEHOLDER_IMAGE_URL)
    expect(getPrimaryImageUrl(undefined)).toBe(PLACEHOLDER_IMAGE_URL)
  })
})

describe("normalizeColor", () => {
  test("ignores case, surrounding spaces and accents", () => {
    expect(normalizeColor("  Café ")).toBe(normalizeColor("cafe"))
    expect(normalizeColor("NEGRO")).toBe("negro")
  })
})

describe("filterImagesByColor", () => {
  const images = [
    img("negro-1.jpg", "Negro"),
    img("negro-2.jpg", "Negro"),
    img("blanco-1.jpg", "Blanco"),
    img("general.jpg", null),
  ]

  test("returns images of the selected color plus the general ones", () => {
    const result = filterImagesByColor(images, "Negro")

    expect(result.map((i) => i.url)).toEqual([
      "negro-1.jpg",
      "negro-2.jpg",
      "general.jpg",
    ])
  })

  test("matches the color ignoring case and accents", () => {
    const result = filterImagesByColor([img("cafe.jpg", "Café")], "cafe")

    expect(result.map((i) => i.url)).toEqual(["cafe.jpg"])
  })

  test("returns every image when no color is selected", () => {
    expect(filterImagesByColor(images, "")).toHaveLength(4)
    expect(filterImagesByColor(images, null)).toHaveLength(4)
  })

  test("returns every image when no image has a color assigned", () => {
    const untagged = [img("a.jpg"), img("b.jpg")]

    expect(filterImagesByColor(untagged, "Negro")).toHaveLength(2)
  })

  test("falls back to the full gallery when the color has no images of its own", () => {
    const result = filterImagesByColor(images, "Rojo")

    expect(result).toHaveLength(4)
  })

  test("does not mutate the received array", () => {
    const original = [...images]

    filterImagesByColor(images, "Negro")

    expect(images).toEqual(original)
  })
})
