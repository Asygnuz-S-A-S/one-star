/**
 * Utilidades puras para sedes físicas (compartidas por servidor y cliente).
 */

/** Texto que reciben dirección y ciudad de una sede creada automáticamente desde el ERP. */
export const STORE_LOCATION_PENDING = "Por definir"

/**
 * Normaliza un nombre de sede para compararlo con el del ERP: ignora mayúsculas,
 * acentos, puntuación y el prefijo de marca ("One Star Fundadores" ≡ "FUNDADORES").
 */
export function normalizeStoreName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bone star\b/g, " ")
    .replace(/\b(tienda|sede|almacen|punto de venta)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ")
}

/** ¿La sede aún tiene la dirección o ciudad de relleno que deja la sincronización? */
export function isStoreLocationPending(store: { address: string; city: string }): boolean {
  return store.address === STORE_LOCATION_PENDING || store.city === STORE_LOCATION_PENDING
}

export interface VariantStoreStock {
  id: string
  name: string
  city: string
  stock: number
}

interface VariantInventoryLike {
  storeLocationId: string | null
  stock: number
  storeLocation?: {
    id: string
    name: string
    city: string
    isActive: boolean
    isWebWarehouse: boolean
  } | null
}

/**
 * Sedes físicas activas con existencias de una variante, de mayor a menor.
 * Informativo: la web no aparta ni reserva; la compra en sede es presencial.
 */
export function getVariantStoreStock(
  inventory: VariantInventoryLike[] | undefined
): VariantStoreStock[] {
  return (inventory ?? [])
    .flatMap((level) => {
      const store = level.storeLocation
      if (!store || store.isWebWarehouse || !store.isActive || level.stock <= 0) return []
      return [{ id: store.id, name: store.name, city: store.city, stock: level.stock }]
    })
    .sort((a, b) => b.stock - a.stock || a.name.localeCompare(b.name, "es"))
}
