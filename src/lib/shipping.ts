/**
 * Constantes y lógica de envío compartidas entre cliente y servidor.
 * IMPORTANTE: el servidor SIEMPRE recalcula el costo de envío con esta
 * lógica; los valores enviados por el cliente son solo informativos.
 */

export type ShippingMethod = "standard" | "express"

export const STANDARD_SHIPPING_THRESHOLD = 200_000
export const STANDARD_SHIPPING_COST = 15_000
export const EXPRESS_SHIPPING_COST = 25_000

export interface ShippingCostOptions {
  /** Pedido compuesto solo por productos digitales (tarjetas de regalo): sin envío. */
  digitalOnly?: boolean
}

export function getShippingCost(
  method: ShippingMethod,
  subtotal: number,
  options: ShippingCostOptions = {}
): number {
  if (options.digitalOnly) return 0
  if (method === "express") return EXPRESS_SHIPPING_COST
  return subtotal >= STANDARD_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST
}
