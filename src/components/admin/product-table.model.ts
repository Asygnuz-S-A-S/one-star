interface ProductStatusInput {
  isPublished: boolean
  isOnSale: boolean
  variants: Array<{ stock: number }>
}

interface BulkPublishResult {
  success: boolean
  error?: string
}

export function createSingleFlightRunner() {
  let isRunning = false

  return {
    async run(operation: () => Promise<void>): Promise<boolean> {
      if (isRunning) return false
      isRunning = true
      try {
        await operation()
        return true
      } finally {
        isRunning = false
      }
    },
  }
}

export function getProductRowId(product: { id: string }): string {
  return product.id
}

export function getAdminProductStatus({
  isPublished,
  isOnSale,
  variants,
}: ProductStatusInput) {
  if (!isPublished) {
    return { label: "INACTIVO", color: "bg-gray-200 text-gray-700" }
  }

  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0)
  if (totalStock === 0) {
    return { label: "AGOTADO", color: "bg-gray-100 text-gray-600" }
  }
  if (isOnSale) {
    return { label: "SALE", color: "bg-red-100 text-[#E31C23]" }
  }
  return { label: "ACTIVO", color: "bg-green-100 text-green-700" }
}

export function getBulkPublishFeedback(
  result: BulkPublishResult,
  isPublished: boolean
) {
  if (!result.success) {
    return {
      clearSelection: false,
      message: result.error?.trim() || "No se pudieron actualizar los productos.",
      type: "error" as const,
    }
  }

  return {
    clearSelection: true,
    message: isPublished
      ? "Productos activados correctamente."
      : "Productos desactivados correctamente.",
    type: "success" as const,
  }
}
