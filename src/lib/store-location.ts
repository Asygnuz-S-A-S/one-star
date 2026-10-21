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

export interface StoreLocationData {
  name?: string | null
  address?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface Coordinates {
  lat: number
  lng: number
}

/**
 * Coordenadas exactas de una tienda física: solo las que se guardaron en el admin.
 * No se adivinan por nombre ni por ciudad: un punto aproximado con el marcador de One Star
 * haría creer al cliente que la tienda está donde no está. Sin coordenadas, el mapa
 * busca la dirección en Google (ver `getStoreMapQuery`).
 */
export function resolveStoreCoordinates(store: StoreLocationData | null | undefined): Coordinates | null {
  if (!store) return null

  if (
    typeof store.latitude === "number" &&
    !Number.isNaN(store.latitude) &&
    typeof store.longitude === "number" &&
    !Number.isNaN(store.longitude) &&
    (store.latitude !== 0 || store.longitude !== 0)
  ) {
    return { lat: store.latitude, lng: store.longitude }
  }

  return null
}

/** Texto para buscar la tienda en Google Maps cuando no tiene coordenadas guardadas. */
export function getStoreMapQuery(store: StoreLocationData): string {
  return [store.name, store.address, store.city].filter(Boolean).join(", ")
}

/**
 * Genera la URL de navegación de Google Maps ("Cómo llegar").
 */
export function getStoreDirectionsUrl(store: StoreLocationData): string {
  const coords = resolveStoreCoordinates(store)
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getStoreMapQuery(store))}`
}
