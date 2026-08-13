import "server-only"

import type { ERPCatalogCategorySuggestion } from "../erp.types"

function normalizedWords(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .match(/[A-Z0-9]+/g) ?? []
  )
}

/** Traduce señales explícitas del nombre Loggro a una categoría web sugerida. */
export function detectLoggroCategory(
  value?: string
): ERPCatalogCategorySuggestion | undefined {
  if (!value) return undefined
  const words = normalizedWords(value)
  if (
    words.has("CHANCLA") ||
    words.has("CHANCLAS") ||
    words.has("SANDALIA") ||
    words.has("SANDALIAS")
  ) {
    return { slug: "chanclas-y-sandalias", name: "Chanclas y Sandalias" }
  }
  return undefined
}
