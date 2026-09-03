import "server-only"

import { createHash } from "node:crypto"
import { getERPAdapter } from "@/server/erp"
import type { ERPOnlineCatalogExclusionReason } from "@/server/erp/erp.types"
import {
  findPublishedCatalogProducts,
  unpublishCatalogProducts,
} from "@/server/repositories/erp-catalog.repository"

interface OnlineExclusionCandidate {
  erpId: string
  name: string
  reason: ERPOnlineCatalogExclusionReason
  updatedAt: string
}

export interface ErpOnlineExclusionBackfillResult {
  dryRun: boolean
  candidateCount: number
  counts: Partial<Record<ERPOnlineCatalogExclusionReason, number>>
  candidates: Array<Pick<OnlineExclusionCandidate, "erpId" | "name" | "reason">>
  updatedCount: number
  fingerprint: string
}

function fingerprintOf(candidates: OnlineExclusionCandidate[]): string {
  return createHash("sha256").update(JSON.stringify(candidates)).digest("hex")
}

export async function syncOnlineCatalogExclusionsFromERP(
  options: { dryRun?: true } | { dryRun: false; fingerprint: string } = {}
): Promise<ErpOnlineExclusionBackfillResult> {
  if (options.dryRun === false && !options.fingerprint?.trim()) {
    throw new Error("Debes proporcionar la huella aprobada de la vista previa.")
  }
  const adapter = getERPAdapter()
  if (!adapter.fetchCatalog) {
    throw new Error("El ERP configurado no permite leer el catálogo.")
  }

  const snapshot = await adapter.fetchCatalog()
  const suggested = snapshot.groups.flatMap((group) =>
    group.onlineCatalogExclusionReason
      ? [{
          erpId: group.erpId,
          name: group.name,
          reason: group.onlineCatalogExclusionReason,
        }]
      : []
  ).sort((left, right) => left.erpId.localeCompare(right.erpId))
  const publishedProducts = new Map(
    (await findPublishedCatalogProducts(suggested.map((candidate) => candidate.erpId)))
      .map((product) => [product.erpId, product] as const)
  )
  const candidates = suggested.flatMap((candidate) => {
    const product = publishedProducts.get(candidate.erpId)
    return product
      ? [{ ...candidate, updatedAt: product.updatedAt.toISOString() }]
      : []
  })
  const counts: Partial<Record<ERPOnlineCatalogExclusionReason, number>> = {}
  for (const candidate of candidates) {
    counts[candidate.reason] = (counts[candidate.reason] ?? 0) + 1
  }
  const fingerprint = fingerprintOf(candidates)
  const candidateDetails = candidates.map(({ erpId, name, reason }) => ({
    erpId,
    name,
    reason,
  }))
  const baseResult = {
    candidateCount: candidates.length,
    counts,
    candidates: candidateDetails,
    fingerprint,
  }

  if (options.dryRun !== false) {
    return { ...baseResult, dryRun: true, updatedCount: 0 }
  }
  if (fingerprint !== options.fingerprint) {
    throw new Error(
      "La vista previa de disponibilidad online cambió. Genera una nueva huella antes de aplicar."
    )
  }
  const updatedCount = await unpublishCatalogProducts(
    candidates.map((candidate) => ({
      erpId: candidate.erpId,
      updatedAt: new Date(candidate.updatedAt),
    }))
  )
  return { ...baseResult, dryRun: false, updatedCount }
}
