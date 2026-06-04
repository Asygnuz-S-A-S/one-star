export function formatCOP(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function buildFilterUrl(
  params: URLSearchParams,
  key: string,
  value: string
): string {
  const next = new URLSearchParams(params.toString())
  if (next.get(key) === value) {
    next.delete(key)
  } else {
    next.set(key, value)
  }
  next.delete("page")
  const qs = next.toString()
  return qs ? `?${qs}` : "?"
}

// Re-exports desde la capa de servicios — las páginas de servidor pueden seguir
// importando estas funciones desde @/lib/shop-utils sin cambiar sus imports.
export { getUniqueBrands } from "@/server/services/product.service"
export { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
