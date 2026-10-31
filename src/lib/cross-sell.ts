import { parseSku } from "@/lib/sku"

/** Máximo de productos sugeridos por producto ("Combínalo con"). */
export const MAX_CROSS_SELLS = 12

/** Referencias de la celda "Ventas cruzadas": separadas por coma, punto y coma o salto de línea. */
export function parseCrossSellRefs(text: string | null | undefined): string[] {
  const refs = (text ?? "").split(/[,;\n|]/).map((ref) => ref.trim()).filter(Boolean)
  return [...new Set(refs)].slice(0, MAX_CROSS_SELLS)
}

/**
 * Producto de cada referencia. Una referencia sirve como SKU de una talla
 * ("1162011-BWHT_10") o como referencia base del producto ("1162011-BWHT").
 */
export function matchCrossSellRefs(
  refs: string[],
  variants: { sku: string; productId: string }[],
): Map<string, string> {
  const byRef = new Map<string, string>()
  for (const variant of variants) {
    for (const key of [variant.sku.trim(), parseSku(variant.sku).baseSku.trim()]) {
      if (refs.includes(key) && !byRef.has(key)) byRef.set(key, variant.productId)
    }
  }
  return byRef
}
