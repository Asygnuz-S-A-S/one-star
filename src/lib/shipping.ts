/**
 * Constantes y lógica de envío compartidas entre cliente y servidor.
 * IMPORTANTE: el servidor SIEMPRE recalcula el costo de envío con esta
 * lógica; los valores enviados por el cliente son solo informativos.
 */

export type ShippingMethod = "standard" | "express"

export const STANDARD_SHIPPING_THRESHOLD = 200_000
export const STANDARD_SHIPPING_COST = 15_000
export const EXPRESS_SHIPPING_COST = 25_000

export function getShippingCost(method: ShippingMethod, subtotal: number): number {
  if (method === "express") return EXPRESS_SHIPPING_COST
  return subtotal >= STANDARD_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST
}
