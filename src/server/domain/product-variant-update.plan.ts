import "server-only"

export interface ExistingProductVariant {
  id: string
  sku: string
  erpId: string | null
  size: string
  stock: number
}

export interface SubmittedProductVariant {
  sku: string
  size: string
  color: string
  stock: number
  inventory: Array<{ storeLocationId: string | null; stock: number }>
  sizeUS?: string | null
  sizeCM?: string | null
  sizeEUR?: string | null
}

export interface PersistedProductVariant extends SubmittedProductVariant {
  id: string
}

export type ProductVariantUpdatePlan =
  | {
      success: true
      updates: PersistedProductVariant[]
      creates: SubmittedProductVariant[]
      deleteIds: string[]
    }
  | {
      success: false
      error: {
        code: "ERP_VARIANT_MISSING" | "DUPLICATE_SKU"
        message: string
      }
    }

export interface ProductVariantUpdatePlanOptions {
  isErpCatalogOwner?: boolean
}

/** Planea el guardado sin recrear variantes sincronizadas por el ERP cuando el ERP es dueño. */
export function buildProductVariantUpdatePlan(
  existing: ExistingProductVariant[],
  submitted: SubmittedProductVariant[],
  options?: ProductVariantUpdatePlanOptions | boolean
): ProductVariantUpdatePlan {
  const isErpCatalogOwner =
    typeof options === "boolean" ? options : Boolean(options?.isErpCatalogOwner)

  const submittedSkus = submitted.map((variant) => variant.sku)
  if (new Set(submittedSkus).size !== submittedSkus.length) {
    return {
      success: false,
      error: { code: "DUPLICATE_SKU", message: "Hay SKUs duplicados en las variantes." },
    }
  }

  const existingBySku = new Map(existing.map((variant) => [variant.sku, variant]))
  const updates: PersistedProductVariant[] = []
  const creates: SubmittedProductVariant[] = []

  for (const variant of submitted) {
    const current = existingBySku.get(variant.sku)
    if (!current) {
      creates.push(variant)
      continue
    }

    const preserveErpFields = Boolean(current.erpId && isErpCatalogOwner)

    updates.push({
      ...variant,
      id: current.id,
      // Solo el ERP es dueño de estos campos si isErpCatalogOwner es true
      size: preserveErpFields ? current.size : variant.size,
      stock: preserveErpFields ? current.stock : variant.stock,
    })
  }

  const missing = existing.filter((variant) => !submittedSkus.includes(variant.sku))
  if (isErpCatalogOwner) {
    const missingErpVariant = missing.find((variant) => variant.erpId)
    if (missingErpVariant) {
      return {
        success: false,
        error: {
          code: "ERP_VARIANT_MISSING",
          message: `La variante ${missingErpVariant.sku} pertenece a Loggro y no se puede eliminar desde el panel.`,
        },
      }
    }
  }

  return {
    success: true,
    updates,
    creates,
    deleteIds: missing.map((variant) => variant.id),
  }
}
