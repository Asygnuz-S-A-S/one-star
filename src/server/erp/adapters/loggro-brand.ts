import "server-only"

import type { ERPCatalogBrandSuggestion } from "../erp.types"

const BRANDS_BY_STABLE_CODE: Record<string, ERPCatalogBrandSuggestion> = {
  "001": { slug: "converse", name: "Converse" },
  "002": { slug: "nike", name: "Nike" },
  "003": { slug: "vans", name: "Vans" },
  "004": { slug: "skechers", name: "Skechers" },
  "005": { slug: "new-balance", name: "New Balance" },
  "006": { slug: "on", name: "On" },
  "007": { slug: "hoka", name: "Hoka" },
  "009": { slug: "discovery", name: "Discovery" },
  "010": { slug: "vans", name: "Vans" },
  "012": { slug: "new-era", name: "New Era" },
  "013": { slug: "discovery", name: "Discovery" },
}

const BRANDS_BY_NAME: Array<{
  pattern: RegExp
  suggestion: ERPCatalogBrandSuggestion
}> = [
  {
    pattern: /\b(?:CONVERSE|CHUCK\s+TAYLOR)\b/i,
    suggestion: { slug: "converse", name: "Converse" },
  },
  {
    pattern: /\bCOLUMBIA\b/i,
    suggestion: { slug: "columbia", name: "Columbia" },
  },
  {
    pattern: /\bRESHOEVN8R\b/i,
    suggestion: { slug: "reshoevn8r", name: "Reshoevn8r" },
  },
  { pattern: /\bNIKE\b/i, suggestion: { slug: "nike", name: "Nike" } },
  { pattern: /\bVANS\b/i, suggestion: { slug: "vans", name: "Vans" } },
  {
    pattern: /\bSKE(?:CHERS|CEHRS|CHERES)\b/i,
    suggestion: { slug: "skechers", name: "Skechers" },
  },
  {
    pattern: /\bNEW\s+(?:BALANCE|BLANCE)\b/i,
    suggestion: { slug: "new-balance", name: "New Balance" },
  },
  {
    pattern: /^(?:TENIS|ZAPATILLA)\s+ON\b/i,
    suggestion: { slug: "on", name: "On" },
  },
  { pattern: /\bHOKA\b/i, suggestion: { slug: "hoka", name: "Hoka" } },
  {
    pattern: /\bNEW\s+ERA\b/i,
    suggestion: { slug: "new-era", name: "New Era" },
  },
  {
    pattern: /\bDISCOVERY\b/i,
    suggestion: { slug: "discovery", name: "Discovery" },
  },
]

export function detectLoggroBrand(
  brandCode: string | undefined,
  productName: string
): ERPCatalogBrandSuggestion | undefined {
  const namedBrand = BRANDS_BY_NAME.find(({ pattern }) => pattern.test(productName))
  if (namedBrand) return namedBrand.suggestion

  const normalizedCode = brandCode?.trim() ?? ""
  if (normalizedCode === "008" || normalizedCode === "011") {
    return { slug: "sin-marca", name: "Sin marca" }
  }
  return BRANDS_BY_STABLE_CODE[normalizedCode]
}
