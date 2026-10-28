export type ProductAvailability = {
  label: string
  detail: string
  tone: "available" | "store-only" | "sold-out"
}

/**
 * Keeps the PDP availability promise aligned with the existing online-channel
 * and variant-stock contracts; it never changes purchase validation.
 */
export function getProductAvailability(availableOnline: boolean, hasStock: boolean): ProductAvailability {
  if (!availableOnline) {
    return {
      label: "Solo disponible en tiendas físicas",
      detail: "Consulta existencias en tienda.",
      tone: "store-only",
    }
  }

  if (!hasStock) {
    return {
      label: "Agotado en línea",
      detail: "Revisa otras tallas o colores.",
      tone: "sold-out",
    }
  }

  return {
    label: "Disponible en línea",
    detail: "Elige talla y agrégalo a la bolsa.",
    tone: "available",
  }
}
