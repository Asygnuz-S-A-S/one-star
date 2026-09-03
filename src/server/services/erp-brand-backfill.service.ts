import "server-only"

import { createHash } from "node:crypto"
import { getERPAdapter } from "@/server/erp"
import {
  ensureCatalogBrand,
  findProvisionalCatalogProductBrands,
  replaceProvisionalCatalogProductBrands,
} from "@/server/repositories/erp-catalog.repository"

interface BrandCandidate {
  erpId: string
  sourceBrandErpId: string
  brandSlug: string
  brandName: string
}

export interface ErpBrandBackfillResult {
  dryRun: boolean
  candidateCount: number
  counts: Record<string, number>
  updatedCount: number
  deletedProvisionalBrandCount: number
  fingerprint: string
}

function fingerprintOf(candidates: BrandCandidate[]): string {
  return createHash("sha256").update(JSON.stringify(candidates)).digest("hex")
}

function provisionalBrandName(brandErpId: string): string {
  return `Por nombrar (${brandErpId})`
}

export async function syncProvisionalProductBrandsFromERP(
  options: { dryRun?: true } | { dryRun: false; fingerprint: string } = {}
): Promise<ErpBrandBackfillResult> {
  if (options.dryRun === false && !options.fingerprint?.trim()) {
    throw new Error("Debes proporcionar la huella aprobada de la vista previa.")
  }
  const adapter = getERPAdapter()
  if (!adapter.fetchCatalog) {
    throw new Error("El ERP configurado no permite leer el catálogo.")
  }

  const snapshot = await adapter.fetchCatalog()
  const suggested = snapshot.groups.flatMap((group) =>
    group.brandSuggestion && group.brandErpId
      ? [{
          erpId: group.erpId,
          sourceBrandErpId: group.brandErpId,
          brandSlug: group.brandSuggestion.slug,
          brandName: group.brandSuggestion.name,
        }]
      : []
  ).sort((left, right) => left.erpId.localeCompare(right.erpId))
  const provisionalProducts = await findProvisionalCatalogProductBrands(
    suggested.map((candidate) => candidate.erpId)
  )
  const provisionalByErpId = new Map(
    provisionalProducts.map((product) => [product.erpId, product] as const)
  )
  const candidates = suggested.filter((candidate) => {
    const product = provisionalByErpId.get(candidate.erpId)
    return product?.brandErpId === candidate.sourceBrandErpId &&
      product.brandName === provisionalBrandName(candidate.sourceBrandErpId)
  })
  const counts: Record<string, number> = {}
  for (const candidate of candidates) {
    counts[candidate.brandSlug] = (counts[candidate.brandSlug] ?? 0) + 1
  }
  const fingerprint = fingerprintOf(candidates)
  const baseResult = {
    candidateCount: candidates.length,
    counts,
    fingerprint,
  }

  if (options.dryRun !== false) {
    return {
      ...baseResult,
      dryRun: true,
      updatedCount: 0,
      deletedProvisionalBrandCount: 0,
    }
  }
  if (fingerprint !== options.fingerprint) {
    throw new Error(
      "La vista previa de marcas cambió. Genera una nueva huella antes de aplicar."
    )
  }
  const brandIds = new Map<string, string>()
  for (const candidate of candidates) {
    if (brandIds.has(candidate.brandSlug)) continue
    const brand = await ensureCatalogBrand({
      slug: candidate.brandSlug,
      name: candidate.brandName,
    })
    brandIds.set(candidate.brandSlug, brand.id)
  }
  const replacement = await replaceProvisionalCatalogProductBrands(
    candidates.map((candidate) => ({
      erpId: candidate.erpId,
      sourceBrandErpId: candidate.sourceBrandErpId,
      targetBrandId: brandIds.get(candidate.brandSlug)!,
    }))
  )
  return {
    ...baseResult,
    dryRun: false,
    ...replacement,
  }
}
