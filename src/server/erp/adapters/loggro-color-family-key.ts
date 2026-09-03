import "server-only"

export interface LoggroColorFamilyCode {
  brandCode?: string
  sku: string
}

function namespacedKey(brandCode: string, modelCode: string): string {
  return `loggro:${brandCode}:${modelCode}`
}

export function deriveLoggroColorFamilyKey({
  brandCode,
  sku,
}: LoggroColorFamilyCode): string | undefined {
  const normalizedBrand = brandCode?.trim()
  const normalizedSku = sku.trim().toUpperCase()

  if (normalizedBrand === "004") {
    const match = normalizedSku.match(/^(\d{5,6})[A-Z]+$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  if (normalizedBrand === "006") {
    const match = normalizedSku.match(/^([A-Z0-9]{7})[A-Z0-9]{4}$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  if (normalizedBrand === "007") {
    const match = normalizedSku.match(/^(\d{7})-[A-Z]+$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  if (normalizedBrand === "003" || normalizedBrand === "010") {
    const match = normalizedSku.match(/^(VN[A-Z0-9]{6})[A-Z0-9]{3,4}$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  if (normalizedBrand === "013") {
    const match = normalizedSku.match(/^([A-Z]+)-\d{3}(?:-[A-Z]+|[A-Z]+)$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  if (normalizedBrand === "002") {
    const match = normalizedSku.match(/^([A-Z]{2}\d{4})-\d{3}$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  if (normalizedBrand === "008") {
    const match = normalizedSku.match(/^((?:\d{8}|[A-Z]{2}\d{4}))-[A-Z0-9]{3}$/)
    return match ? namespacedKey(normalizedBrand, match[1]) : undefined
  }

  return undefined
}
