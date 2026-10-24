import type { ShippingRates } from "@/lib/shipping"
import { parseProductFaqs, type ProductFaq } from "@/lib/product-faq"
import {
  DEFAULT_SITE_FAQS,
  DEFAULT_SITE_HIGHLIGHTS,
  getStorePromises,
  RETURN_WINDOW_DAYS,
  type StorePromise,
} from "@/lib/store-promises"

export interface ProductContentSource {
  highlights?: string[] | null
  faqs?: unknown
}

export interface BrandContentSource {
  highlights?: string[] | null
  faqs?: unknown
}

export interface GlobalContentSource {
  highlights?: string[] | null
  faqs?: unknown
  promises?: unknown
  returnWindowDays?: number | null
}

export interface ResolveProductContentInput {
  product?: ProductContentSource | null
  brand?: BrandContentSource | null
  global?: GlobalContentSource | null
  hasWhatsapp?: boolean
  shipping?: ShippingRates
}

export interface ResolvedProductContent {
  highlights: string[]
  faqs: ProductFaq[]
  promises: StorePromise[]
  returnWindowDays: number
}

/**
 * Resuelve el contenido de conversión en 3 niveles de prioridad:
 * Regla: producto > marca > global > predeterminado en código.
 *
 * - Beneficios (highlights): gana el nivel más específico que tenga al menos un elemento no vacío.
 * - FAQs: gana el nivel más específico que tenga al menos una pregunta válida.
 * - Promesas y ventana de devolución: se definen a nivel global (la marca no altera promesas de tienda).
 */
export function resolveProductContent(input: ResolveProductContentInput): ResolvedProductContent {
  const { product, brand, global, hasWhatsapp = false } = input

  // 1. Highlights
  const productHighlights = (product?.highlights ?? []).map((h) => h.trim()).filter(Boolean)
  const brandHighlights = (brand?.highlights ?? []).map((h) => h.trim()).filter(Boolean)
  const globalHighlights = (global?.highlights ?? []).map((h) => h.trim()).filter(Boolean)

  let highlights: string[]
  if (productHighlights.length > 0) {
    highlights = productHighlights
  } else if (brandHighlights.length > 0) {
    highlights = brandHighlights
  } else if (globalHighlights.length > 0) {
    highlights = globalHighlights
  } else {
    highlights = DEFAULT_SITE_HIGHLIGHTS
  }

  // 2. FAQs
  const productFaqs = parseProductFaqs(product?.faqs)
  const brandFaqs = parseProductFaqs(brand?.faqs)
  const globalFaqs = parseProductFaqs(global?.faqs)

  let faqs: ProductFaq[]
  if (productFaqs.length > 0) {
    faqs = productFaqs
  } else if (brandFaqs.length > 0) {
    faqs = brandFaqs
  } else if (globalFaqs.length > 0) {
    faqs = globalFaqs
  } else {
    faqs = DEFAULT_SITE_FAQS
  }

  // 3. Return window & promises
  const returnWindowDays =
    typeof global?.returnWindowDays === "number" && global.returnWindowDays > 0
      ? global.returnWindowDays
      : RETURN_WINDOW_DAYS

  const promises = getStorePromises({
    hasWhatsapp,
    returnWindowDays,
    customPromises: global?.promises,
    freeThreshold: input.shipping?.freeThreshold,
  })

  return {
    highlights,
    faqs,
    promises,
    returnWindowDays,
  }
}
