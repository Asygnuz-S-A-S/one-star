/**
 * Criterios de orden del catálogo (HU-9).
 *
 * El valor viaja en la URL (`?orden=precio_asc`) para que el listado ordenado
 * se pueda compartir. Las opciones viven aquí para que la barra superior, el
 * panel de filtros y el servicio muestren y acepten exactamente las mismas.
 */

export type ProductSortValue =
  | "reciente"
  | "antiguo"
  | "precio_asc"
  | "precio_desc"
  | "az"
  | "za"

export const DEFAULT_PRODUCT_SORT: ProductSortValue = "reciente"

export interface ProductSortOption {
  value: ProductSortValue
  label: string
}

export const PRODUCT_SORT_OPTIONS: readonly ProductSortOption[] = [
  { value: "reciente", label: "Más reciente" },
  { value: "antiguo", label: "Más antiguo" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "az", label: "Nombre: A-Z" },
  { value: "za", label: "Nombre: Z-A" },
]

const VALID_VALUES = new Set<string>(PRODUCT_SORT_OPTIONS.map((option) => option.value))

/**
 * Normaliza el valor recibido en la URL. Un criterio desconocido cae al orden
 * por defecto en lugar de romper la consulta.
 */
export function resolveProductSort(raw: string | undefined | null): ProductSortValue {
  if (!raw) return DEFAULT_PRODUCT_SORT
  const value = raw.trim()
  return VALID_VALUES.has(value) ? (value as ProductSortValue) : DEFAULT_PRODUCT_SORT
}
