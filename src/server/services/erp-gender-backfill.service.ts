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
  options: { dryRun?: true } | { dryRun: false; fingerprint: string } = {}
): Promise<ErpGenderBackfillResult> {
  if (options.dryRun === false && !options.fingerprint?.trim()) {
    throw new Error("Debes proporcionar la huella aprobada de la vista previa.")
  }

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
  const missingErpIds = new Set(
    await findMissingCatalogProductErpIds(
      classifiedCandidates.map((candidate) => candidate.erpId)
    )
  )
  const candidates = classifiedCandidates.filter((candidate) =>
    missingErpIds.has(candidate.erpId)
  )
  const fingerprint = genderCandidatesFingerprint(candidates)

  if (options.dryRun !== false) {
    return {
      dryRun: true,
      candidateCount: candidates.length,
      unclassifiedCount,
      updatedCount: 0,
      fingerprint,
    }
  }

  if (fingerprint !== options.fingerprint) {
    throw new Error(
      "La vista previa de géneros cambió. Genera una nueva huella antes de aplicar."
    )
  }

  const updatedCount = await fillMissingCatalogProductGenders(candidates)
  return {
    dryRun: false,
    candidateCount: candidates.length,
    unclassifiedCount,
    updatedCount,
    fingerprint,
  }
}
