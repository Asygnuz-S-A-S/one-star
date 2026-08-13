import "server-only"

import { getERPAdapter } from "@/server/erp"
import type { ERPProductGender } from "@/server/erp/erp.types"
import { fillMissingCatalogProductGenders } from "@/server/repositories/erp-catalog.repository"

export interface ErpGenderBackfillResult {
  dryRun: boolean
  candidateCount: number
  unclassifiedCount: number
  updatedCount: number
}

export async function syncMissingProductGendersFromERP(
  options: { dryRun?: boolean } = {}
): Promise<ErpGenderBackfillResult> {
  const adapter = getERPAdapter()
  if (!adapter.fetchCatalog) {
    throw new Error("El ERP configurado no permite leer el catálogo.")
  }

  const snapshot = await adapter.fetchCatalog()
  const candidates = snapshot.groups.flatMap((group) =>
    group.gender
      ? [{ erpId: group.erpId, gender: group.gender as ERPProductGender }]
      : []
  )
  const unclassifiedCount = snapshot.groups.length - candidates.length
  const dryRun = options.dryRun ?? true

  if (dryRun) {
    return {
      dryRun: true,
      candidateCount: candidates.length,
      unclassifiedCount,
      updatedCount: 0,
    }
  }

  const updatedCount = await fillMissingCatalogProductGenders(candidates)
  return {
    dryRun: false,
    candidateCount: candidates.length,
    unclassifiedCount,
    updatedCount,
  }
}
