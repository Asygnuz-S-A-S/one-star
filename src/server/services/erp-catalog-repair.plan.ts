import "server-only"

import type { ERPCatalogProductGroup } from "@/server/erp/erp.types"

export interface LocalErpCatalogVariant {
  id: string
  erpId: string | null
  sku: string
  protectedDataCount?: number
}

export interface LocalErpCatalogProduct {
  id: string
  erpId: string | null
  slug: string
  /** Imágenes, contenido enriquecido o relaciones que impiden borrarlo. */
  protectedDataCount: number
  variants: LocalErpCatalogVariant[]
}

export interface ErpCatalogProductTarget {
  productId: string
  erpId: string
  sku: string
  name: string
  basePrice: number
  unitOfMeasure?: string
}

export interface ErpCatalogRepairPlan {
  targetProducts: ErpCatalogProductTarget[]
  moveVariants: Array<{ variantId: string; targetProductId: string }>
  deleteVariantIds: string[]
  deleteProductIds: string[]
}

export type ErpCatalogRepairPlanResult =
  | { success: true; plan: ErpCatalogRepairPlan }
  | {
      success: false
      error: {
        code: "MISSING_PRODUCT" | "MISSING_VARIANT" | "PROTECTED_DATA"
        message: string
        recoverable: boolean
      }
    }

/**
 * Construye un plan determinista y sin efectos secundarios para convertir el
 * catálogo plano histórico en productos padre con sus variantes reales.
 */
export function buildErpCatalogRepairPlan(
  groups: ERPCatalogProductGroup[],
  products: LocalErpCatalogProduct[]
): ErpCatalogRepairPlanResult {
  const productsByErpId = new Map(
    products
      .filter((product) => product.erpId)
      .map((product) => [String(product.erpId), product] as const)
  )
  const variantsByErpId = new Map<
    string,
    { variant: LocalErpCatalogVariant; productId: string }
  >()

  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.erpId) {
        variantsByErpId.set(String(variant.erpId), { variant, productId: product.id })
      }
    }
  }

  const parentErpIds = new Set(groups.map((group) => group.erpId))
  const currentVariantErpIds = new Set(
    groups.flatMap((group) => group.variants.map((variant) => variant.erpId))
  )
  const targetProductIds = new Set<string>()
  const targetProducts: ErpCatalogProductTarget[] = []
  const moveVariants: ErpCatalogRepairPlan["moveVariants"] = []

  for (const group of groups) {
    const variantErpIds = new Set(group.variants.map((variant) => variant.erpId))
    const variantProductCandidates = group.variants
      .map((variant) => productsByErpId.get(variant.erpId))
      .filter((product): product is LocalErpCatalogProduct => Boolean(product))
      .filter(
        (product, index, candidates) =>
          candidates.findIndex((candidate) => candidate.id === product.id) === index
      )
      .sort((left, right) => {
        const protectedDifference =
          right.protectedDataCount - left.protectedDataCount
        if (protectedDifference !== 0) return protectedDifference

        const slugDifference =
          Number(right.slug === group.sku) - Number(left.slug === group.sku)
        if (slugDifference !== 0) return slugDifference

        const matchingVariants = (product: LocalErpCatalogProduct) =>
          product.variants.filter(
            (variant) => variant.erpId && variantErpIds.has(variant.erpId)
          ).length
        return matchingVariants(right) - matchingVariants(left)
      })
    const target =
      productsByErpId.get(group.erpId) ??
      variantProductCandidates[0]

    if (!target) {
      return {
        success: false,
        error: {
          code: "MISSING_PRODUCT",
          message: `No existe un producto local que pueda representar ${group.sku}.`,
          recoverable: true,
        },
      }
    }

    targetProductIds.add(target.id)
    targetProducts.push({
      productId: target.id,
      erpId: group.erpId,
      sku: group.sku,
      name: group.name,
      basePrice: group.basePrice,
      unitOfMeasure: group.unitOfMeasure,
    })

    for (const sourceVariant of group.variants) {
      const local = variantsByErpId.get(sourceVariant.erpId)
      if (!local) {
        return {
          success: false,
          error: {
            code: "MISSING_VARIANT",
            message: `No existe la variante local ${sourceVariant.sku}.`,
            recoverable: true,
          },
        }
      }
      if (local.productId !== target.id) {
        moveVariants.push({
          variantId: local.variant.id,
          targetProductId: target.id,
        })
      }
    }
  }

  const deleteVariantIds = products.flatMap((product) =>
    product.variants
      .filter((variant) => {
        if (!variant.erpId) return false
        return parentErpIds.has(variant.erpId) || !currentVariantErpIds.has(variant.erpId)
      })
      .map((variant) => variant.id)
  )
  const deleteVariantIdSet = new Set(deleteVariantIds)
  const protectedVariant = products
    .flatMap((product) => product.variants)
    .find(
      (variant) =>
        deleteVariantIdSet.has(variant.id) && (variant.protectedDataCount ?? 0) > 0
    )
  if (protectedVariant) {
    return {
      success: false,
      error: {
        code: "PROTECTED_DATA",
        message: `La variante ${protectedVariant.sku} tiene relaciones protegidas.`,
        recoverable: false,
      },
    }
  }

  const deleteProducts = products.filter(
    (product) => product.erpId && !targetProductIds.has(product.id)
  )
  const protectedProduct = deleteProducts.find(
    (product) => product.protectedDataCount > 0
  )
  if (protectedProduct) {
    return {
      success: false,
      error: {
        code: "PROTECTED_DATA",
        message: `El producto ${protectedProduct.slug} tiene información protegida.`,
        recoverable: false,
      },
    }
  }

  return {
    success: true,
    plan: {
      targetProducts,
      moveVariants,
      deleteVariantIds,
      deleteProductIds: deleteProducts.map((product) => product.id),
    },
  }
}
