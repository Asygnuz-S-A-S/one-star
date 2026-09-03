import "server-only"
import { prisma } from "../db/prisma"
import { STORE_LOCATION_PENDING, normalizeStoreName } from "@/lib/store-location"

export interface StoreLocationInput {
  name: string
  address: string
  city: string
  phone?: string | null
  schedule?: string | null
  googleMapsUrl?: string | null
  latitude?: number | null
  longitude?: number | null
  isActive: boolean
  /** Establecimiento del ERP vinculado; null desvincula la sede. */
  erpId?: string | null
}

export interface ErpStoreLocationInput {
  erpId: string
  name: string
}

export async function findStoreLocations() {
  return prisma.storeLocation.findMany({
    orderBy: { createdAt: "asc" }
  })
}

export async function createStoreLocation(data: StoreLocationInput) {
  return prisma.storeLocation.create({ data })
}

export async function updateStoreLocation(id: string, data: StoreLocationInput) {
  return prisma.storeLocation.update({ where: { id }, data })
}

export async function deleteStoreLocation(id: string) {
  return prisma.storeLocation.delete({ where: { id } })
}

export async function setStoreLocationActive(id: string, isActive: boolean) {
  return prisma.storeLocation.update({ where: { id }, data: { isActive } })
}

/**
 * Garantiza una sede web por cada establecimiento del ERP y devuelve el mapa
 * `erpId → storeLocationId`.
 *
 * Orden de resolución por establecimiento:
 *   1. Sede ya vinculada por `erpId`.
 *   2. Sede sin vínculo cuyo nombre coincide (ignorando marca, acentos y mayúsculas):
 *      se vincula para no duplicar tiendas creadas a mano antes de la integración.
 *   3. Se crea OCULTA con dirección y ciudad de relleno, para que el administrador
 *      las complete en /admin/tiendas antes de publicarla.
 */
export async function ensureErpStoreLocations(
  locations: ErpStoreLocationInput[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (locations.length === 0) return result

  const stores = await prisma.storeLocation.findMany({
    select: { id: true, name: true, erpId: true },
  })
  const byErpId = new Map(
    stores.flatMap((store) => (store.erpId ? [[store.erpId, store.id] as const] : []))
  )
  const unlinkedByName = new Map(
    stores
      .filter((store) => !store.erpId)
      .map((store) => [normalizeStoreName(store.name), store.id] as const)
  )

  for (const location of locations) {
    const linkedId = byErpId.get(location.erpId)
    if (linkedId) {
      result.set(location.erpId, linkedId)
      continue
    }

    const normalized = normalizeStoreName(location.name)
    const matchId = normalized ? unlinkedByName.get(normalized) : undefined
    if (matchId) {
      await prisma.storeLocation.update({
        where: { id: matchId },
        data: { erpId: location.erpId },
      })
      unlinkedByName.delete(normalized)
      result.set(location.erpId, matchId)
      continue
    }

    const created = await prisma.storeLocation.create({
      data: {
        erpId: location.erpId,
        name: location.name,
        address: STORE_LOCATION_PENDING,
        city: STORE_LOCATION_PENDING,
        isActive: false,
      },
      select: { id: true },
    })
    result.set(location.erpId, created.id)
  }

  return result
}
