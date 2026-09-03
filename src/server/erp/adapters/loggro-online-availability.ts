import "server-only"

import type { ERPOnlineCatalogExclusionReason } from "../erp.types"

interface LoggroOnlineAvailabilityInput {
  brandCode?: string
  name: string
  basePrice: number
}

export function detectLoggroOnlineExclusion({
  brandCode,
  name,
  basePrice,
}: LoggroOnlineAvailabilityInput): ERPOnlineCatalogExclusionReason | undefined {
  if (brandCode?.trim() === "011" && /^BOLSAS?\b/i.test(name.trim())) {
    return "INTERNAL_ITEM"
  }
  if (/\bOBSE(?:Q|G)UIOS?\b/i.test(name)) {
    return "GIFT"
  }
  if (/\b(?:PRUEBA|TEST)\b/i.test(name)) {
    return "TEST_ITEM"
  }
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return "NON_POSITIVE_PRICE"
  }
  return undefined
}
