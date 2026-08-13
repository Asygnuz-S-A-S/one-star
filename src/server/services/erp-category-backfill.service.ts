import "server-only"

import { createHash } from "node:crypto"
import { getERPAdapter } from "@/server/erp"
import {
  findDefaultCatalogProductErpIds,
  findDefaultImportCategory,
} from "@/server/repositories/erp-catalog.repository"

interface CategoryCandidate {
  erpId: string
  categorySlug: string
  categoryName: string
}

export interface ErpCategoryBackfillResult {
  dryRun: boolean
  candidateCount: number
  counts: Record<string, number>
  updatedCount: number
  fingerprint: string
}

function fingerprintOf(candidates: CategoryCandidate[]): string {
  return createHash("sha256").update(JSON.stringify(candidates)).digest("hex")
}

export async function syncDefaultProductCategoriesFromERP(
  options: { dryRun?: true } = {}
): Promise<ErpCategoryBackfillResult> {
  const adapter = getERPAdapter()
  if (!adapter.fetchCatalog) {
    throw new Error("El ERP configurado no permite leer el catálogo.")
  }
  const defaultCategory = await findDefaultImportCategory()
  if (!defaultCategory) {
    throw new Error("No existe la categoría Sin Categoría.")
  }

  const snapshot = await adapter.fetchCatalog()
  const suggested = snapshot.groups.flatMap((group) =>
    group.categorySuggestion
      ? [{
          erpId: group.erpId,
          categorySlug: group.categorySuggestion.slug,
          categoryName: group.categorySuggestion.name,
        }]
      : []
  ).sort((left, right) => left.erpId.localeCompare(right.erpId))
  const eligibleErpIds = new Set(
    await findDefaultCatalogProductErpIds(
      suggested.map((candidate) => candidate.erpId),
      defaultCategory.id
    )
  )
  const candidates = suggested.filter((candidate) => eligibleErpIds.has(candidate.erpId))
  const counts: Record<string, number> = {}
  for (const candidate of candidates) {
    counts[candidate.categorySlug] = (counts[candidate.categorySlug] ?? 0) + 1
  }

  return {
    dryRun: options.dryRun ?? true,
    candidateCount: candidates.length,
    counts,
    updatedCount: 0,
    fingerprint: fingerprintOf(candidates),
  }
}
