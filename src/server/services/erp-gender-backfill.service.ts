import "server-only"

import { createHash } from "node:crypto"
import { getERPAdapter } from "@/server/erp"
import {
  fillMissingCatalogProductGenders,
  findMissingCatalogProductErpIds,
} from "@/server/repositories/erp-catalog.repository"

export interface ErpGenderBackfillResult {
  dryRun: boolean
  candidateCount: number
  unclassifiedCount: number
  updatedCount: number
  fingerprint?: string
}

function genderCandidatesFingerprint(
  candidates: Array<{ erpId: string; gender: string }>
): string {
  return createHash("sha256")
    .update(JSON.stringify(candidates))
    .digest("hex")
}

export async function syncMissingProductGendersFromERP(
  options: { dryRun?: boolean } = {}
): Promise<ErpGenderBackfillResult> {
  const adapter = getERPAdapter()
  if (!adapter.fetchCatalog) {
    throw new Error("El ERP configurado no permite leer el catálogo.")
  }

  const snapshot = await adapter.fetchCatalog()
  const classifiedCandidates = snapshot.groups.flatMap((group) =>
    group.gender
      ? [{ erpId: group.erpId, gender: group.gender }]
      : []
  ).sort((left, right) => left.erpId.localeCompare(right.erpId))
  const unclassifiedCount = snapshot.groups.length - classifiedCandidates.length
  const dryRun = options.dryRun ?? true

  if (dryRun) {
    const missingErpIds = new Set(
      await findMissingCatalogProductErpIds(
        classifiedCandidates.map((candidate) => candidate.erpId)
      )
    )
    const candidates = classifiedCandidates.filter((candidate) =>
      missingErpIds.has(candidate.erpId)
    )
    return {
      dryRun: true,
      candidateCount: candidates.length,
      unclassifiedCount,
      updatedCount: 0,
      fingerprint: genderCandidatesFingerprint(candidates),
    }
  }

  const updatedCount = await fillMissingCatalogProductGenders(classifiedCandidates)
  return {
    dryRun: false,
    candidateCount: classifiedCandidates.length,
    unclassifiedCount,
    updatedCount,
  }
}
