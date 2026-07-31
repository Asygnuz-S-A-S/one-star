import { describe, expect, test } from "vitest"
import { buildProductCardColorSummary } from "../product-card-colors"

describe("buildProductCardColorSummary", () => {
  test("deduplica los colores repetidos por talla ignorando mayúsculas y acentos", () => {
    const summary = buildProductCardColorSummary(
      [
        { color: "Blanco" },
        { color: "blanco" },
        { color: "Café" },
        { color: "cafe" },
        { color: "Negro" },
      ],
      []
    )

    expect(summary.options.map((option) => option.name)).toEqual([
      "Blanco",
      "Café",
      "Negro",
    ])
    expect(summary.total).toBe(3)
    expect(summary.label).toBe("3 colores")
  })

  test("omite valores que no representan un color real", () => {
    const summary = buildProductCardColorSummary(
      [
        { color: "" },
        { color: "N/A" },
        { color: "Sin color" },
        { color: "-" },
        { color: "Azul" },
      ],
      []
    )

    expect(summary.options).toEqual([{ name: "Azul" }])
    expect(summary.label).toBe("1 color")
  })

  test("asocia la primera imagen etiquetada para cada color", () => {
    const summary = buildProductCardColorSummary(
      [{ color: "Café" }, { color: "Negro" }],
      [
        { url: "/general.jpg", color: null },
        { url: "/cafe-1.jpg", color: "cafe" },
        { url: "/cafe-2.jpg", color: "Café" },
      ]
    )

    expect(summary.options).toEqual([
      { name: "Café", imageUrl: "/cafe-1.jpg" },
      { name: "Negro" },
    ])
    expect(summary.imageOptions).toEqual([
      { name: "Café", imageUrl: "/cafe-1.jpg" },
    ])
  })

  test("limita las opciones visibles sin perder el total real", () => {
    const colors = ["Negro", "Blanco", "Rojo", "Azul", "Verde", "Beige"]
    const summary = buildProductCardColorSummary(
      colors.map((color) => ({ color })),
      colors.map((color) => ({ url: `/${color.toLowerCase()}.jpg`, color }))
    )

    expect(summary.visibleOptions.map((option) => option.name)).toEqual([
      "Negro",
      "Blanco",
      "Rojo",
    ])
    expect(summary.hiddenCount).toBe(3)
    expect(summary.total).toBe(6)
    expect(summary.label).toBe("6 colores")
    expect(summary.imageOptions).toEqual(
      colors.map((color) => ({
        name: color,
        imageUrl: `/${color.toLowerCase()}.jpg`,
      }))
    )
  })

  test("no crea miniaturas cuando las imágenes no están etiquetadas por color", () => {
    const summary = buildProductCardColorSummary(
      [{ color: "Blanco" }, { color: "Negro" }],
      [
        { url: "/frontal.jpg", color: null },
        { url: "/lateral.jpg" },
        { url: "   ", color: "Blanco" },
      ]
    )

    expect(summary.imageOptions).toEqual([])
    expect(summary.label).toBe("2 colores")
  })

  test("no crea una etiqueta cuando el producto no tiene colores reales", () => {
    const summary = buildProductCardColorSummary(
      [{ color: "" }, { color: "N/A" }],
      []
    )

    expect(summary.options).toEqual([])
    expect(summary.total).toBe(0)
    expect(summary.label).toBeNull()
  })
})
