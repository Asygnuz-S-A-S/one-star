export interface ErpSyncCountLike {
  processedCount: number
  productCount?: number
  variantCount?: number
}

/** Evita presentar los ítems planos históricos de Loggro como productos web. */
export function formatErpSyncCount(value: ErpSyncCountLike): string {
  if (value.productCount != null && value.variantCount != null) {
    return `${value.productCount} productos · ${value.variantCount} variantes`
  }
  return `${value.processedCount} registros ERP`
}
