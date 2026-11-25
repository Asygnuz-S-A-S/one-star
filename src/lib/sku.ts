/**
 * Interpretación de los SKU (códigos de ítem) que llegan del ERP.
 *
 * Un producto de la tienda agrupa varias variantes que comparten el mismo
 * "SKU base"; el resto del código identifica la talla.
 *
 * Formatos soportados, en orden de precedencia:
 *   1. `MODELO-COLOR_TALLA`  → "1162011-BWHT_10"  → base "1162011-BWHT", talla "10"
 *      Es el formato del catálogo de calzado: el guion bajo separa la talla, así
 *      que cada combinación modelo+color queda como un producto con sus tallas.
 *   2. `MODELO-TALLA`        → "NB574AZ-38"       → base "NB574AZ", talla "38"
 *   3. Sin separador         → "ZAPATO"           → base "ZAPATO", talla "Única"
 */

/** Talla asignada cuando el SKU no distingue variantes. */
export const DEFAULT_SIZE = "Única"

const SIZE_SEPARATOR = "_"
const BASE_SEPARATOR = "-"

export interface ParsedSku {
  /** Código que agrupa las variantes en un mismo producto. */
  baseSku: string
  /** Talla de la variante. */
  size: string
}

export function parseSku(sku: string): ParsedSku {
  const trimmed = sku.trim()

  // 1. El guion bajo manda: todo lo anterior (modelo y color) es el producto.
  const underscoreAt = trimmed.lastIndexOf(SIZE_SEPARATOR)
  if (underscoreAt > 0) {
    const base = trimmed.slice(0, underscoreAt)
    const size = trimmed.slice(underscoreAt + 1).trim()
    if (size) return { baseSku: base, size }
    return { baseSku: base, size: DEFAULT_SIZE }
  }

  // 2. Formato clásico: lo que sigue al primer guion es la talla.
  const dashAt = trimmed.indexOf(BASE_SEPARATOR)
  if (dashAt > 0) {
    const size = trimmed.slice(dashAt + 1).trim()
    if (size) return { baseSku: trimmed.slice(0, dashAt), size }
  }

  // 3. Producto sin variantes declaradas.
  return { baseSku: trimmed, size: DEFAULT_SIZE }
}

/**
 * SKU que se muestra en la ficha: el de la talla elegida o, sin talla,
 * la referencia (SKU base) del color seleccionado.
 */
export function getDisplaySku(
  variants: ReadonlyArray<{ sku: string; color?: string | null; size?: string | null }>,
  selectedColor?: string | null,
  selectedSize?: string | null,
): string | null {
  const ofColor = variants.filter((v) => v.color === selectedColor)
  const pool = ofColor.length > 0 ? ofColor : variants
  if (selectedSize) {
    const exact = pool.find((v) => v.size === selectedSize)
    if (exact?.sku) return exact.sku
  }
  const reference = pool.find((v) => v.sku)
  return reference ? parseSku(reference.sku).baseSku : null
}
