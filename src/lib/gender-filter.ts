/**
 * Filtro de género del catálogo (HU-8).
 *
 * El dato viene de Loggro (detectado al sincronizar) y vive en `Product.gender`
 * con los valores del enum Prisma. En la URL se usa un valor corto y legible
 * (`?genero=mujer`), que aquí se traduce al conjunto de valores del enum.
 */

export type GenderFilterValue = "hombre" | "mujer" | "ninos" | "unisex"

export interface GenderFilterOption {
  value: GenderFilterValue
  label: string
  /** Valores de `Product.gender` que cubre la opción. */
  genders: string[]
}

/**
 * Hombre y Mujer incluyen Unisex, igual que las secciones /c/hombre y /c/mujer:
 * un visitante que filtra "Mujer" espera ver también lo que le sirve.
 */
export const GENDER_FILTER_OPTIONS: readonly GenderFilterOption[] = [
  { value: "hombre", label: "Hombre", genders: ["HOMBRE", "UNISEX"] },
  { value: "mujer", label: "Mujer", genders: ["MUJER", "UNISEX"] },
  { value: "ninos", label: "Niños", genders: ["NINO", "NINA", "INFANTIL", "BEBE"] },
  { value: "unisex", label: "Unisex", genders: ["UNISEX"] },
]

const OPTIONS_BY_VALUE = new Map(GENDER_FILTER_OPTIONS.map((option) => [option.value, option]))

/**
 * Traduce el valor de `?genero=` a los valores de `Product.gender` que debe
 * incluir la consulta. No distingue mayúsculas; un valor del enum sin opción
 * propia (`NINA`, `BEBE`…) se usa tal cual. Devuelve `null` si no se reconoce.
 */
export function resolveGenderFilter(raw: string | undefined | null): string[] | null {
  if (!raw) return null
  const value = raw.trim()
  if (!value) return null

  const option = OPTIONS_BY_VALUE.get(value.toLowerCase() as GenderFilterValue)
  if (option) return option.genders

  const enumValue = value.toUpperCase()
  const isEnumValue = GENDER_FILTER_OPTIONS.some((o) => o.genders.includes(enumValue))
  return isEnumValue ? [enumValue] : null
}

/** Etiqueta para mostrar el filtro activo ("Género: Mujer"). */
export function getGenderFilterLabel(raw: string | undefined | null): string | null {
  if (!raw) return null
  const option = OPTIONS_BY_VALUE.get(raw.trim().toLowerCase() as GenderFilterValue)
  return option?.label ?? null
}
