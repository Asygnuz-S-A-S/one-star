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

function normalizedTokens(value: string): string[] {
  return [...normalizedWords(value)]
}

/** Traduce señales explícitas del nombre Loggro a una categoría web sugerida. */
export function detectLoggroCategory(
  value?: string
): ERPCatalogCategorySuggestion | undefined {
  if (!value) return undefined
  const words = normalizedWords(value)
  const tokens = normalizedTokens(value)
  if (
    words.has("CHANCLA") ||
    words.has("CHANCLAS") ||
    words.has("SANDALIA") ||
    words.has("SANDALIAS")
  ) {
    return { slug: "chanclas-y-sandalias", name: "Chanclas y Sandalias" }
  }

  if (
    words.has("OBSEQUIO") ||
    words.has("OBSEQUIOS") ||
    tokens[0] === "BOLSA" ||
    tokens[0] === "BOLSAS"
  ) {
    return undefined
  }

  const explicitAccessoryStart = new Set([
    "GORRA",
    "GORRAS",
    "MOCHILA",
    "MOCHILAS",
    "MALETIN",
    "MALETINES",
    "RESHOEVN8R",
  ])
  const accessory =
    explicitAccessoryStart.has(tokens[0] ?? "") ||
    words.has("CINTURON") ||
    words.has("CINTURONES") ||
    words.has("CORDON") ||
    words.has("CORDONES") ||
    words.has("SOCKS") ||
    words.has("MEDIAS") ||
    words.has("CALCETIN") ||
    words.has("CALCETINES")

  return accessory ? { slug: "accesorios", name: "Accesorios" } : undefined
}
