import { describe, expect, test } from "vitest"
import {
  buildProductCardColorSummary,
  buildProductFamilyCardColorSummary,
} from "../product-card-colors"

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

    expect(summary.options).toEqual([{ name: "Azul", imageUrls: [] }])
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
      { name: "Café", imageUrl: "/cafe-1.jpg", imageUrls: ["/cafe-1.jpg", "/cafe-2.jpg"] },
      { name: "Negro", imageUrls: [] },
    ])
    expect(summary.imageOptions).toEqual([
      { name: "Café", imageUrl: "/cafe-1.jpg", imageUrls: ["/cafe-1.jpg", "/cafe-2.jpg"] },
    ])
  })

  test("reúne todas las fotos de cada color, en orden, para recorrerlas al pasar el cursor", () => {
    const summary = buildProductCardColorSummary(
      [{ color: "Azul" }, { color: "Rosa" }, { color: "Verde" }],
      [
        { url: "/azul-1.jpg", color: "Azul" },
        { url: "/rosa-1.jpg", color: "rosa" },
        { url: "/azul-2.jpg", color: "azul" },
        { url: "/general.jpg", color: null },
        { url: "/rosa-2.jpg", color: "Rosa" },
      ]
    )

    const byName = new Map(summary.options.map((option) => [option.name, option.imageUrls]))

    expect(byName.get("Azul")).toEqual(["/azul-1.jpg", "/azul-2.jpg"])
    expect(byName.get("Rosa")).toEqual(["/rosa-1.jpg", "/rosa-2.jpg"])
    // Un color sin fotos propias no hereda las generales.
    expect(byName.get("Verde")).toEqual([])
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
        imageUrls: [`/${color.toLowerCase()}.jpg`],
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

describe("buildProductFamilyCardColorSummary", () => {
  test("construye una miniatura enlazada por cada producto de color", () => {
    const summary = buildProductFamilyCardColorSummary([
      {
        id: "product-black",
        slug: "modelo-negro",
        name: "Modelo negro",
        variants: [{ color: "Negro" }],
        images: [{ url: "/black.jpg", color: "Negro" }],
      },
      {
        id: "product-white",
        slug: "modelo-blanco",
        name: "Modelo blanco",
        variants: [{ color: "Blanco" }],
        images: [{ url: "/white.jpg", color: "Blanco" }],
      },
    ])

    expect(summary.imageOptions).toEqual([
      expect.objectContaining({ name: "Negro", productId: "product-black", slug: "modelo-negro" }),
      expect.objectContaining({ name: "Blanco", productId: "product-white", slug: "modelo-blanco" }),
    ])
    expect(summary.label).toBe("2 colores")
  })

  test("mantiene navegable un color sin foto usando el placeholder", () => {
    const summary = buildProductFamilyCardColorSummary([
      {
        id: "product-green",
        slug: "modelo-verde",
        name: "Modelo verde",
        variants: [{ color: "Verde" }],
        images: [],
      },
    ])

    expect(summary.imageOptions).toEqual([
      expect.objectContaining({
        name: "Verde",
        slug: "modelo-verde",
        imageUrl: "/placeholder-product.svg",
        imageUrls: ["/placeholder-product.svg"],
      }),
    ])
  })
})
