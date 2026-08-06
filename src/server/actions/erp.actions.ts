"use server"

import {
  runErpEndpointDiagnostics,
  syncCatalogFromERP,
} from "@/server/services/erp-sync.service"
import { requireAdmin, UnauthorizedError } from "@/server/auth/require-admin"
import { sanitizeErpError } from "@/server/erp/erp-error"

export async function syncCatalogAction() {
  try {
    await requireAdmin()
    const result = await syncCatalogFromERP("MANUAL")
    return result
  } catch (error) {
    return { success: false, processedCount: 0, error: sanitizeErpError(error) }
  }
}

/** Probe explícito, autenticado y de solo lectura para el panel de integraciones. */
export async function diagnoseErpEndpointsAction() {
  try {
    await requireAdmin()
    return await runErpEndpointDiagnostics()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return {
        checkedAt: new Date().toISOString(),
        accessDenied: true as const,
        results: [],
      }
    }

    const detail = sanitizeErpError(error)
    return {
      checkedAt: new Date().toISOString(),
      results: (["connection", "catalog", "stock"] as const).map((endpoint) => ({
        endpoint,
        status: "error" as const,
        httpStatus: null,
        latencyMs: 0,
        detail,
      })),
    }
  }
}
