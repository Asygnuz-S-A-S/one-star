/**
 * Resume el JSON de `AbandonedCart.cartData`. El checkout lo guarda como lista
 * de ítems; `{ items }` y `{ total }` son formatos anteriores que siguen en la base.
 */
export function summarizeCartData(cartData: unknown): { itemsCount: number; value: number } {
  if (!cartData || typeof cartData !== "object") return { itemsCount: 0, value: 0 }
  const data = cartData as Record<string, unknown>
  const items = Array.isArray(cartData) ? cartData : data.items
  if (Array.isArray(items)) {
    const value = (items as Array<Record<string, unknown>>).reduce(
      (sum, item) => sum + Number(item.price ?? item.unitPrice ?? 0) * Number(item.quantity ?? 1),
      0
    )
    return { itemsCount: items.length, value }
  }
  return { itemsCount: 0, value: typeof data.total === "number" ? data.total : 0 }
}
