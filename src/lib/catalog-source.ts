/**
 * Tipos y funciones puras para determinar la fuente de verdad del catálogo.
 * Soporta modo "ARCHIVO" (Excel en tiempo real) y modo "ERP" (Mekano / Loggro).
 */

export type CatalogSource = "ERP" | "ARCHIVO"

export const CATALOG_SOURCES: readonly CatalogSource[] = ["ERP", "ARCHIVO"] as const
export const DEFAULT_CATALOG_SOURCE: CatalogSource = "ARCHIVO"

export function isErpProviderConfigured(provider?: string | null): boolean {
  if (!provider) return false
  const trimmed = provider.trim().toLowerCase()
  return trimmed !== "" && trimmed !== "null" && trimmed !== "undefined"
}

export function normalizeCatalogSource(value?: string | null): CatalogSource {
  if (value?.toUpperCase().trim() === "ERP") {
    return "ERP"
  }
  return "ARCHIVO"
}

/**
 * Devuelve `true` ÚNICAMENTE si:
 *  1. La fuente del catálogo es "ERP", Y
 *  2. Hay un ERP configurado en el entorno (ERP_PROVIDER distinto de null/vacío).
 *
 * En cualquier otro caso (fuente ARCHIVO o ERP_PROVIDER nulo/vacío), devuelve `false`.
 */
export function isErpCatalogOwnerSync(
  catalogSource?: string | null,
  erpProvider?: string | null
): boolean {
  const source = normalizeCatalogSource(catalogSource)
  if (source !== "ERP") return false
  return isErpProviderConfigured(erpProvider)
}
