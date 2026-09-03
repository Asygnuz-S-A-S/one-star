import "server-only"
import type { StoreLocation } from "@prisma/client"
import { getERPAdapter } from "@/server/erp"
import type { ERPStockLocation } from "@/server/erp"
import {
  createStoreLocation,
  deleteStoreLocation,
  findStoreLocations,
  setStoreLocationActive,
  updateStoreLocation,
} from "../repositories/store.repository"
import type { StoreLocationInput } from "../validators/store-location.validator"

export async function getStoreLocations(): Promise<StoreLocation[]> {
  return findStoreLocations()
}

export async function createStore(input: StoreLocationInput): Promise<StoreLocation> {
  return createStoreLocation(input)
}

export async function updateStore(id: string, input: StoreLocationInput): Promise<StoreLocation> {
  return updateStoreLocation(id, input)
}

export async function deleteStore(id: string): Promise<void> {
  await deleteStoreLocation(id)
}

export async function setStoreActive(id: string, isActive: boolean): Promise<void> {
  await setStoreLocationActive(id, isActive)
}

/**
 * Sedes que el ERP expone para inventario. Devuelve [] si el adaptador no las
 * distingue o si el ERP no responde: el panel sigue operable sin vínculo.
 */
export async function getErpStockLocations(): Promise<ERPStockLocation[]> {
  const erp = getERPAdapter()
  if (!erp.listStockLocations) return []
  try {
    return await erp.listStockLocations()
  } catch (error) {
    console.error("[Store Service] No se pudieron listar las sedes del ERP:", error)
    return []
  }
}
