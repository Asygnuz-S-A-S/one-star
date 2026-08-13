import "server-only"

import type { ERPProductGender } from "../erp.types"

function normalizedWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .match(/[A-Z0-9]+/g) ?? []
}

/** Traduce únicamente señales explícitas del texto de Loggro al contrato ERP común. */
export function detectLoggroGender(value?: string): ERPProductGender | undefined {
  if (!value) return undefined
  const words = new Set(normalizedWords(value))
  if (words.has("UNISEX")) return "UNISEX"

  const female = words.has("MUJER") || words.has("DAMA")
  const male = words.has("HOMBRE") || words.has("CABALLERO")
  if (female === male) return undefined
  return female ? "MUJER" : "HOMBRE"
}
