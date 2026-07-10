import "server-only"
import { findStoreLocations } from "../repositories/store.repository"
import type { StoreLocation } from "@prisma/client"

export async function getStoreLocations(): Promise<StoreLocation[]> {
  return findStoreLocations()
}
