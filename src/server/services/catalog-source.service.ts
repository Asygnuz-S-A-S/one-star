import "server-only"

import {
  isErpCatalogOwnerSync,
  normalizeCatalogSource,
  type CatalogSource,
} from "@/lib/catalog-source"
import { findStoreSettingsReadOnly } from "@/server/repositories/store-settings.repository"
import { updateCatalogSource as updateSettingsCatalogSource } from "@/server/services/store-settings.service"

/**
 * Devuelve la fuente de catálogo actualmente configurada ("ERP" | "ARCHIVO").
 * Si no está configurada, devuelve "ARCHIVO".
 */
export async function getActiveCatalogSource(): Promise<CatalogSource> {
  const settings = await findStoreSettingsReadOnly()
  return normalizeCatalogSource(settings?.catalogSource)
}

/**
 * Helper único que devuelve true si y solo si:
 *   1. La fuente de catálogo está fijada en "ERP", Y
 *   2. Hay un ERP configurado en el entorno (ERP_PROVIDER !== "null" && no vacío).
 *
 * En cualquier otro caso (fuente ARCHIVO o ERP_PROVIDER nulo), devuelve false.
 */
export async function isErpCatalogOwner(): Promise<boolean> {
  const source = await getActiveCatalogSource()
  return isErpCatalogOwnerSync(source, process.env.ERP_PROVIDER)
}

export async function setCatalogSource(source: CatalogSource) {
  return updateSettingsCatalogSource(source)
}
