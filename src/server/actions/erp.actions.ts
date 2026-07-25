"use server"

import { syncCatalogFromERP } from "@/server/services/erp-sync.service"
import { requireAdmin } from "@/server/auth/require-admin"

export async function syncCatalogAction() {
  try {
    await requireAdmin()
    const result = await syncCatalogFromERP("MANUAL")
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, processedCount: 0, error: msg }
  }
}
