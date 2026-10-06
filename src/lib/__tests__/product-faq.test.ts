import { describe, expect, it } from "vitest"
import { faqsFromText, faqsToText, highlightsFromText, parseProductFaqs, splitHighlight } from "@/lib/product-faq"

describe("parseProductFaqs", () => {
  it("descarta entradas inválidas y recorta espacios", () => {
    expect(parseProductFaqs([{ q: " ¿Talla? ", a: " Normal " }, { q: "x" }, null, { q: "", a: "y" }])).toEqual([
      { q: "¿Talla?", a: "Normal" },
    ])
  })

  it("devuelve [] si no es un arreglo", () => {
    expect(parseProductFaqs(null)).toEqual([])
    expect(parseProductFaqs({})).toEqual([])
  })
})

describe("texto del admin", () => {
  it("convierte líneas 'Pregunta | Respuesta' y respeta barras en la respuesta", () => {
    const faqs = faqsFromText("¿Envío? | Sí, gratis | desde $200.000\nlínea sin respuesta\n")
    expect(faqs).toEqual([{ q: "¿Envío?", a: "Sí, gratis | desde $200.000" }])
    expect(faqsFromText(faqsToText(faqs))).toEqual(faqs)
  })

  it("beneficios: una línea cada uno, sin vacíos, máximo 8", () => {
    const text = ["a", "", " b ", ...Array.from({ length: 12 }, (_, i) => `x${i}`)].join("\n")
    const result = highlightsFromText(text)
    expect(result.slice(0, 2)).toEqual(["a", "b"])
    expect(result).toHaveLength(8)
  })
})

describe("splitHighlight", () => {
  it("separa 'Título: detalle'", () => {
    expect(splitHighlight("Suela de caucho: agarre en pisos mojados")).toEqual({
      title: "Suela de caucho",
      detail: "agarre en pisos mojados",
    })
  })

  it("sin dos puntos devuelve el texto completo como título", () => {
    expect(splitHighlight("Cambios gratis por 30 días")).toEqual({ title: "Cambios gratis por 30 días", detail: null })
  })
})
