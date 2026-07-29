/**
 * Paleta de colores de producto de One Star.
 *
 * Fuente única para el selector del admin y para los swatches del filtro de
 * la tienda: así el color que se guarda siempre tiene su equivalente visual.
 *
 * Los colores combinados se expresan con "/" (ej. "Rojo/Negro") y se dibujan
 * como swatch bipartido, sin necesidad de enumerar cada combinación.
 */

import type { CSSProperties } from "react"
import { normalizeColor } from "@/lib/product-image"

/** Separador de colores combinados. */
export const COLOR_SEPARATOR = "/"

/** Color de respaldo cuando un nombre no está en la paleta. */
const FALLBACK_HEX = "#9E9E9E"

/** Paleta de colores: nombre visible → color CSS. */
export type ColorPalette = Record<string, string>

/**
 * Paleta de respaldo. La fuente real es la tabla `ProductColor`
 * (administrable en /admin/colores); esta copia se usa como semilla de la
 * migración y como fallback si aún no se cargó la paleta.
 */
export const PRODUCT_COLORS: ColorPalette = {
  Negro: "#1C1C1C",
  Blanco: "#FFFFFF",
  Gris: "#9E9E9E",
  Rojo: "#E31C23",
  Azul: "#1565C0",
  "Azul Marino": "#0D2B54",
  Celeste: "#4FC3F7",
  Verde: "#2E7D32",
  Lima: "#AEEA00",
  Amarillo: "#FDD835",
  Naranja: "#E65100",
  Rosa: "#EC407A",
  Morado: "#6A1B9A",
  Café: "#6D4C41",
  Beige: "#D7CCC8",
  Crema: "#F5F0E1",
  Dorado: "#C9A227",
  Plateado: "#C0C0C0",
  Multicolor: "#9E9E9E",
}

/** Combinaciones frecuentes en calzado, ofrecidas como atajo en el admin. */
export const COMMON_COLOR_COMBOS: readonly string[] = [
  "Blanco/Negro",
  "Negro/Blanco",
  "Rojo/Negro",
  "Blanco/Rojo",
  "Blanco/Azul",
  "Blanco/Verde",
  "Negro/Gris",
  "Azul/Blanco",
]

/**
 * Valores que NO representan un color real y no deben ofrecerse como filtro.
 * `"N/A"` es el marcador histórico que dejaba la sincronización con el ERP.
 */
const NON_COLOR_VALUES = new Set(["", "n/a", "na", "n.a.", "-", "sin color", "ninguno"])

/** ¿El valor es un color real (y no un marcador vacío tipo "N/A")? */
export function isRealColor(color: string | null | undefined): boolean {
  if (!color) return false
  return !NON_COLOR_VALUES.has(color.trim().toLowerCase())
}

/**
 * Colores CSS de un nombre. Devuelve un elemento por cada parte:
 * "Rojo" → ["#E31C23"]; "Rojo/Negro" → ["#E31C23", "#1C1C1C"].
 *
 * @param palette Paleta a usar; por defecto la de respaldo.
 */
export function getColorHexes(color: string, palette: ColorPalette = PRODUCT_COLORS): string[] {
  return color
    .split(COLOR_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => palette[part] ?? findNormalized(part, palette) ?? FALLBACK_HEX)
}

function findNormalized(name: string, palette: ColorPalette): string | undefined {
  const target = normalizeColor(name)
  const match = Object.keys(palette).find((key) => normalizeColor(key) === target)
  return match ? palette[match] : undefined
}

/**
 * Estilo CSS del swatch: color plano para simples, mitad y mitad para
 * combinados (dos o más tonos repartidos en diagonal).
 */
export function getColorSwatchStyle(
  color: string,
  palette: ColorPalette = PRODUCT_COLORS
): CSSProperties {
  const hexes = getColorHexes(color, palette)
  if (hexes.length === 0) return { backgroundColor: FALLBACK_HEX }
  if (hexes.length === 1) return { backgroundColor: hexes[0] }

  const step = 100 / hexes.length
  const stops = hexes
    .map((hex, i) => `${hex} ${i * step}%, ${hex} ${(i + 1) * step}%`)
    .join(", ")
  return { backgroundImage: `linear-gradient(135deg, ${stops})` }
}

export interface ColorSelectGroup {
  label: string
  options: readonly string[]
}

/**
 * Opciones del selector del admin, agrupadas para el `<optgroup>`.
 * Los combinados se ofrecen solo si sus dos partes están en la paleta.
 */
export function buildColorSelectGroups(palette: ColorPalette): ColorSelectGroup[] {
  const names = Object.keys(palette)
  const combos = COMMON_COLOR_COMBOS.filter((combo) =>
    combo.split(COLOR_SEPARATOR).every((part) => part.trim() in palette)
  )

  const groups: ColorSelectGroup[] = [{ label: "Colores", options: names }]
  if (combos.length > 0) groups.push({ label: "Combinados", options: combos })
  return groups
}

/** ¿El color ya aparece en el selector (paleta o combinación ofrecida)? */
export function isKnownColor(color: string, palette: ColorPalette = PRODUCT_COLORS): boolean {
  const trimmed = color.trim()
  if (trimmed in palette) return true
  return (COMMON_COLOR_COMBOS as readonly string[]).includes(trimmed)
}
