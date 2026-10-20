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

// Coordenadas exactas verificadas de sedes One Star
const KNOWN_STORE_COORDINATES: Array<{
  matches: (store: StoreLocationData) => boolean
  coords: Coordinates
}> = [
  {
    // One Star Unicentro (Medellín - Cra. 66B #34A-76)
    matches: (s) =>
      /unicentro/i.test(s.name ?? "") || /unicentro/i.test(s.address ?? "") || /66b/i.test(s.address ?? ""),
    coords: { lat: 6.2408625, lng: -75.587071 },
  },
  {
    // One Star Fundadores (Medellín - Cl. 50 #46-36)
    matches: (s) =>
      /fundadores/i.test(s.name ?? "") || /fundadores/i.test(s.address ?? "") || /46-36/i.test(s.address ?? ""),
    coords: { lat: 6.25143, lng: -75.56452 },
  },
  {
    // One Star Centro (Medellín - Cra. 50 #50-20)
    matches: (s) =>
      /centro/i.test(s.name ?? "") || /candelaria/i.test(s.address ?? "") || /50-20/i.test(s.address ?? ""),
    coords: { lat: 6.25052, lng: -75.56781 },
  },
]

// Fallback por ciudad principal en Colombia si es una sede nueva sin coordenadas
const CITY_FALLBACK_COORDINATES: Record<string, Coordinates> = {
  medellin: { lat: 6.244203, lng: -75.581212 },
  bogota: { lat: 4.60971, lng: -74.08175 },
  cali: { lat: 3.451647, lng: -76.531985 },
  barranquilla: { lat: 10.96854, lng: -74.78132 },
  bucaramanga: { lat: 7.12539, lng: -73.1198 },
  manizales: { lat: 5.06889, lng: -75.51738 },
  pereira: { lat: 4.81333, lng: -75.69611 },
}

/**
 * Resuelve las coordenadas exactas de una tienda física.
 * 1. Usa `latitude` y `longitude` si son válidos y distintos de 0.
 * 2. Si no, busca en la lista de sedes oficiales One Star conocidas por nombre o dirección.
 * 3. Si no coincide, busca por ciudad.
 * 4. Si ninguna coincide, devuelve null.
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

  for (const entry of KNOWN_STORE_COORDINATES) {
    if (entry.matches(store)) {
      return entry.coords
    }
  }

  if (store.city) {
    const normalizedCity = store.city
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
    if (CITY_FALLBACK_COORDINATES[normalizedCity]) {
      return CITY_FALLBACK_COORDINATES[normalizedCity]
    }
  }

  return null
}

/**
 * Genera la URL de navegación de Google Maps ("Cómo llegar").
 */
export function getStoreDirectionsUrl(store: StoreLocationData): string {
  const coords = resolveStoreCoordinates(store)
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
  }

  const queryParts = [store.name, store.address, store.city].filter(Boolean).join(", ")
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(queryParts)}`
}
