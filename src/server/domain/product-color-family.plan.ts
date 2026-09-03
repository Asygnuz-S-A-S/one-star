import "server-only"
import { isRealColor } from "@/lib/colors"
import { normalizeColor } from "@/lib/product-image"

export function normalizeColorFamilyMemberIds(
  productId: string,
  requestedMemberIds: readonly string[]
): string[] {
  return [
    productId,
    ...new Set(
      requestedMemberIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0 && id !== productId)
    ),
  ]
}

export interface ProductCatalogCandidate {
  id: string
  colorFamilyId: string | null
}

export interface ProductColorFamilyMembership {
  id: string
  colorFamilyId: string | null
  colors?: readonly string[]
}

export type ProductColorFamilyUpdatePlan =
  | {
      success: true
      mode: "none" | "create" | "update" | "dissolve"
      familyId: string | null
      memberIds: string[]
    }
  | {
      success: false
      error:
        | { code: "MISSING_PRODUCT"; productId: string }
        | { code: "FOREIGN_FAMILY"; productId: string }
        | { code: "INVALID_COLOR"; productId: string }
        | { code: "DUPLICATE_COLOR"; productId: string }
        | { code: "STALE_FAMILY"; productId: string }
    }

export function planProductColorFamilyUpdate(input: {
  productId: string
  currentFamilyId: string | null
  currentMemberIds?: readonly string[]
  expectedCurrentMemberIds?: readonly string[]
  requestedMemberIds: readonly string[]
  products: readonly ProductColorFamilyMembership[]
}): ProductColorFamilyUpdatePlan {
  const memberIds = normalizeColorFamilyMemberIds(
    input.productId,
    input.requestedMemberIds
  )
  const productsById = new Map(input.products.map((product) => [product.id, product]))
  const colorsByProduct = new Map<string, string>()

  if (input.currentMemberIds && input.expectedCurrentMemberIds) {
    const currentIds = normalizeColorFamilyMemberIds(input.productId, input.currentMemberIds).sort()
    const expectedIds = normalizeColorFamilyMemberIds(
      input.productId,
      input.expectedCurrentMemberIds
    ).sort()
    if (
      currentIds.length !== expectedIds.length ||
      currentIds.some((id, index) => id !== expectedIds[index])
    ) {
      return {
        success: false,
        error: { code: "STALE_FAMILY", productId: input.productId },
      }
    }
  }

  for (const memberId of memberIds) {
    const product = productsById.get(memberId)
    if (!product) {
      return {
        success: false,
        error: { code: "MISSING_PRODUCT", productId: memberId },
      }
    }
    if (product.colorFamilyId && product.colorFamilyId !== input.currentFamilyId) {
      return {
        success: false,
        error: { code: "FOREIGN_FAMILY", productId: memberId },
      }
    }
    if (product.colors) {
      const realColors = [
        ...new Set(product.colors.filter(isRealColor).map((color) => normalizeColor(color))),
      ]
      if (realColors.length !== 1) {
        return {
          success: false,
          error: { code: "INVALID_COLOR", productId: memberId },
        }
      }
      colorsByProduct.set(memberId, realColors[0])
    }
  }

  const seenColors = new Set<string>()
  for (const memberId of memberIds) {
    const color = colorsByProduct.get(memberId)
    if (!color) continue
    if (seenColors.has(color)) {
      return {
        success: false,
        error: { code: "DUPLICATE_COLOR", productId: memberId },
      }
    }
    seenColors.add(color)
  }

  if (memberIds.length < 2) {
    return {
      success: true,
      mode: input.currentFamilyId ? "dissolve" : "none",
      familyId: input.currentFamilyId,
      memberIds,
    }
  }

  if (input.currentFamilyId && input.currentMemberIds) {
    const currentIds = normalizeColorFamilyMemberIds(input.productId, input.currentMemberIds).sort()
    const requestedIds = [...memberIds].sort()
    if (
      currentIds.length === requestedIds.length &&
      currentIds.every((id, index) => id === requestedIds[index])
    ) {
      return {
        success: true,
        mode: "none",
        familyId: input.currentFamilyId,
        memberIds,
      }
    }
  }

  return {
    success: true,
    mode: input.currentFamilyId ? "update" : "create",
    familyId: input.currentFamilyId,
    memberIds,
  }
}

export function buildVisibleProductPage(
  candidates: readonly ProductCatalogCandidate[],
  page: number,
  pageSize: number
): { productIds: string[]; total: number } {
  const seen = new Set<string>()
  const visibleIds: string[] = []

  for (const candidate of candidates) {
    const unitId = candidate.colorFamilyId ?? `product:${candidate.id}`
    if (seen.has(unitId)) continue
    seen.add(unitId)
    visibleIds.push(candidate.id)
  }

  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1
  const safePageSize = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 24
  const start = (safePage - 1) * safePageSize

  return {
    productIds: visibleIds.slice(start, start + safePageSize),
    total: visibleIds.length,
  }
}
