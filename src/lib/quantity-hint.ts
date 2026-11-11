export interface QuantityHint {
  /** "info" = orientación; "limit" = el cliente llegó al tope de unidades. */
  tone: "info" | "limit"
  text: string
}

/**
 * Aviso bajo el selector de cantidad. Sin él, el «+» deshabilitado parecía roto (QA, 10 nov):
 * sin talla no se sabe por qué no sube, y con 1 par en stock no se sabe que es el último.
 */
export function getQuantityHint({
  hasSize,
  available,
  inCart,
  quantity,
}: {
  hasSize: boolean
  /** Unidades que aún se pueden agregar: stock de la talla menos lo que ya está en el carrito. */
  available: number
  inCart: number
  quantity: number
}): QuantityHint | null {
  if (!hasSize) return null
  if (available <= 0) {
    return { tone: "limit", text: "Ya tienes en el carrito todas las unidades de esta talla." }
  }
  if (quantity >= available) {
    const left = available === 1 ? "Solo queda 1 par" : `Solo quedan ${available} pares`
    return { tone: "limit", text: inCart > 0 ? `${left} más en esta talla (ya tienes ${inCart} en el carrito).` : `${left} en esta talla.` }
  }
  if (inCart > 0) {
    return { tone: "info", text: `Ya tienes ${inCart} de esta talla en el carrito.` }
  }
  return null
}
