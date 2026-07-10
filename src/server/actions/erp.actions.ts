"use server"

import { syncCatalogFromERP } from "@/server/services/erp-sync.service"

export async function syncCatalogAction() {
  try {
    const result = await syncCatalogFromERP()
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, processedCount: 0, error: msg }
  }
}
