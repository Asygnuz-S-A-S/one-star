import { describe, it, expect } from "vitest"
import { resolveProductContent } from "../product-content-resolver"
import { DEFAULT_SITE_FAQS, DEFAULT_SITE_HIGHLIGHTS, RETURN_WINDOW_DAYS } from "../store-promises"

describe("resolveProductContent", () => {
  it("utiliza valores por defecto si no hay datos en ningún nivel", () => {
    const result = resolveProductContent({ product: null, brand: null, global: null })
    expect(result.highlights).toEqual(DEFAULT_SITE_HIGHLIGHTS)
    expect(result.faqs).toEqual(DEFAULT_SITE_FAQS)
    expect(result.returnWindowDays).toBe(RETURN_WINDOW_DAYS)
    expect(result.promises.length).toBeGreaterThan(0)
    expect(result.promises.some((p) => p.id === "support")).toBe(false)
  })

  it("incluye soporte por WhatsApp si hasWhatsapp es true", () => {
    const result = resolveProductContent({
      product: null,
      brand: null,
      global: null,
      hasWhatsapp: true,
    })
    expect(result.promises.some((p) => p.id === "support")).toBe(true)
  })

  it("gana el contenido global sobre los defaults cuando no hay producto ni marca", () => {
    const result = resolveProductContent({
      product: { highlights: [], faqs: [] },
      brand: { highlights: [], faqs: [] },
      global: {
        highlights: ["Global: Garantía directa"],
        faqs: [{ q: "¿Pregunta global?", a: "Respuesta global" }],
        returnWindowDays: 45,
      },
    })
    expect(result.highlights).toEqual(["Global: Garantía directa"])
    expect(result.faqs).toEqual([{ q: "¿Pregunta global?", a: "Respuesta global" }])
    expect(result.returnWindowDays).toBe(45)
    const returnsPromise = result.promises.find((p) => p.id === "returns")
    expect(returnsPromise?.title).toContain("45 días")
  })

  it("gana el contenido de marca sobre el global cuando el producto no tiene contenido", () => {
    const result = resolveProductContent({
      product: { highlights: [], faqs: [] },
      brand: {
        highlights: ["Nike: Innovación y amortiguación"],
        faqs: [{ q: "¿Nike talla normal?", a: "Recomendamos pedir media talla más." }],
      },
      global: {
        highlights: ["Global: Garantía directa"],
        faqs: [{ q: "¿Pregunta global?", a: "Respuesta global" }],
      },
    })
    expect(result.highlights).toEqual(["Nike: Innovación y amortiguación"])
    expect(result.faqs).toEqual([{ q: "¿Nike talla normal?", a: "Recomendamos pedir media talla más." }])
  })

  it("gana el contenido del producto sobre la marca y el global", () => {
    const result = resolveProductContent({
      product: {
        highlights: ["Air Jordan 1: Cuero premium"],
        faqs: [{ q: "¿Este modelo incluye cordones extra?", a: "Sí, incluye cordones blancos y negros." }],
      },
      brand: {
        highlights: ["Nike: Innovación y amortiguación"],
        faqs: [{ q: "¿Nike talla normal?", a: "Recomendamos pedir media talla más." }],
      },
      global: {
        highlights: ["Global: Garantía directa"],
        faqs: [{ q: "¿Pregunta global?", a: "Respuesta global" }],
      },
    })
    expect(result.highlights).toEqual(["Air Jordan 1: Cuero premium"])
    expect(result.faqs).toEqual([{ q: "¿Este modelo incluye cordones extra?", a: "Sí, incluye cordones blancos y negros." }])
  })

  it("combina granularmente: producto define highlights pero hereda faqs de la marca", () => {
    const result = resolveProductContent({
      product: {
        highlights: ["Producto: Edición especial"],
        faqs: [],
      },
      brand: {
        highlights: ["Marca: Resistencia"],
        faqs: [{ q: "¿Cómo limpiar estas zapatillas?", a: "Usar un paño húmedo." }],
      },
      global: {
        highlights: ["Global: Beneficio"],
        faqs: [{ q: "¿Global?", a: "Sí" }],
      },
    })
    expect(result.highlights).toEqual(["Producto: Edición especial"])
    expect(result.faqs).toEqual([{ q: "¿Cómo limpiar estas zapatillas?", a: "Usar un paño húmedo." }])
  })

  it("ignora listas vacías o con solo espacios en blanco", () => {
    const result = resolveProductContent({
      product: { highlights: ["   ", ""], faqs: [{ q: "   ", a: "" }] },
      brand: { highlights: ["Marca válida"], faqs: [{ q: "¿Marca?", a: "Sí" }] },
    })
    expect(result.highlights).toEqual(["Marca válida"])
    expect(result.faqs).toEqual([{ q: "¿Marca?", a: "Sí" }])
  })
})
