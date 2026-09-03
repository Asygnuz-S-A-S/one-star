import "server-only"

import { getERPAdapter } from "@/server/erp"
import {
  prepareErpColorFamilyReconciliation,
  type ErpColorFamilyKeyUpdate,
} from "@/server/domain/erp-color-family.plan"
import {
  applyErpColorFamilyKeyUpdates,
  findErpColorFamilyBackfillProducts,
  fingerprintErpColorFamilyReconciliation,
} from "@/server/repositories/erp-color-family.repository"

export interface ErpColorFamilyBackfillPreview {
  dryRun: true
  fingerprint: string
  matchedProductCount: number
  recognizedProductCount: number
  unrecognizedProductCount: number
  changedKeyCount: number
  familiesToCreate: number
  familiesToUpdate: number
  familiesOmitted: number
  unchangedFamilies: number
  unrecognizedProducts: Array<{
    productId: string
    slug: string
    erpId: string
    reason: "UNRECOGNIZED_FORMAT"
  }>
  omissions: Array<{
    key: string
    reason: string
    productIds: string[]
  }>
}

async function buildPreview() {
  const adapter = getERPAdapter()
  if (!adapter.fetchCatalog) {
    throw new Error("El ERP configurado no expone un catálogo para previsualizar el backfill.")
  }

  const [products, snapshot] = await Promise.all([
    findErpColorFamilyBackfillProducts(),
    adapter.fetchCatalog(),
  ])
  const groupsByErpId = new Map(snapshot.groups.map((group) => [group.erpId, group]))
  const groupsBySku = new Map(snapshot.groups.map((group) => [group.sku, group]))
  const updates: ErpColorFamilyKeyUpdate[] = []
  let recognizedProductCount = 0
  let unrecognizedProductCount = 0
  const unrecognizedProducts: ErpColorFamilyBackfillPreview["unrecognizedProducts"] = []

  for (const product of products) {
    if (!product.erpId) continue
    const group = groupsByErpId.get(product.erpId) ?? groupsBySku.get(product.slug)
    if (!group) continue
    const key = group.colorFamilyKey ?? null
    updates.push({ productId: product.id, key })
    if (key) recognizedProductCount += 1
    else {
      unrecognizedProductCount += 1
      unrecognizedProducts.push({
        productId: product.id,
        slug: product.slug,
        erpId: product.erpId,
        reason: "UNRECOGNIZED_FORMAT",
      })
    }
  }

  const reconciliation = prepareErpColorFamilyReconciliation(products, updates)
  const fingerprint = fingerprintErpColorFamilyReconciliation(reconciliation)
  const preview: ErpColorFamilyBackfillPreview = {
    dryRun: true,
    fingerprint,
    matchedProductCount: updates.length,
    recognizedProductCount,
    unrecognizedProductCount,
    changedKeyCount: reconciliation.changedUpdates.length,
    familiesToCreate: reconciliation.plan.actions.filter(
      (action) => action.mode === "create"
    ).length,
    familiesToUpdate: reconciliation.plan.actions.filter(
      (action) => action.mode === "add"
    ).length,
    familiesOmitted: reconciliation.plan.omissions.length,
    unchangedFamilies: reconciliation.plan.unchangedKeys.length,
    unrecognizedProducts,
    omissions: reconciliation.plan.omissions,
  }

  return { preview, updates }
}

export async function previewErpColorFamilyBackfill(): Promise<ErpColorFamilyBackfillPreview> {
  return (await buildPreview()).preview
}

export async function applyErpColorFamilyBackfill(expectedFingerprint: string) {
  if (!expectedFingerprint.trim()) {
    throw new Error("Debes aprobar el fingerprint de un preview antes de aplicar el backfill.")
  }

  const { preview, updates } = await buildPreview()
  if (preview.fingerprint !== expectedFingerprint) {
    throw new Error(
      "El preview aprobado ya no coincide con el catálogo actual. Previsualiza nuevamente."
    )
  }

  const applied = await applyErpColorFamilyKeyUpdates(updates, expectedFingerprint)
  return {
    ...preview,
    dryRun: false as const,
    familiesCreated: applied.reconciliation.plan.actions.filter(
      (action) => action.mode === "create"
    ).length,
    familiesUpdated: applied.reconciliation.plan.actions.filter(
      (action) => action.mode === "add"
    ).length,
  }
}
