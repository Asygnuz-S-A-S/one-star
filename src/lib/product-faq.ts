export interface ProductFaq {
  q: string
  a: string
}

const MAX_FAQS = 12

/** Valida el JSON guardado en `Product.faqs`: ignora cualquier entrada mal formada. */
export function parseProductFaqs(value: unknown): ProductFaq[] {
  if (!Array.isArray(value)) return []
  const faqs: ProductFaq[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const { q, a } = item as { q?: unknown; a?: unknown }
    if (typeof q !== "string" || typeof a !== "string") continue
    const question = q.trim()
    const answer = a.trim()
    if (question && answer) faqs.push({ q: question, a: answer })
    if (faqs.length === MAX_FAQS) break
  }
  return faqs
}

/** Texto del admin → lista de FAQs. Formato: una pregunta por línea, "Pregunta | Respuesta". */
export function faqsFromText(text: string): ProductFaq[] {
  return parseProductFaqs(
    text.split("\n").map((line) => {
      const [q, ...rest] = line.split("|")
      return { q, a: rest.join("|") }
    })
  )
}

export function faqsToText(faqs: ProductFaq[]): string {
  return faqs.map((f) => `${f.q} | ${f.a}`).join("\n")
}

/**
 * Un beneficio puede escribirse "Título corto: detalle". Junto al botón de compra
 * se muestra solo el título; la sección "¿Por qué comprarlo?" muestra título y detalle.
 */
export function splitHighlight(text: string): { title: string; detail: string | null } {
  const index = text.indexOf(":")
  if (index < 3) return { title: text.trim(), detail: null }
  const detail = text.slice(index + 1).trim()
  return { title: text.slice(0, index).trim(), detail: detail || null }
}

/** Beneficios: una línea por beneficio; descarta vacíos y limita el total. */
export function highlightsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
}
