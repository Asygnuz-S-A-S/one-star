/**
 * Constantes y lógica de envío compartidas entre cliente y servidor.
 * IMPORTANTE: el servidor SIEMPRE recalcula el costo de envío con esta
 * lógica; los valores enviados por el cliente son solo informativos.
 */

export type ShippingMethod = "standard" | "express"

export interface ShippingRates {
  /** Compra desde la que el envío estándar es gratis, en pesos. */
  freeThreshold: number
  standardCost: number
  expressCost: number
}

/** Valores de respaldo. La tienda publicada usa los de Configuración. */
export const DEFAULT_SHIPPING_RATES: ShippingRates = {
  freeThreshold: 200_000,
  standardCost: 15_000,
  expressCost: 25_000,
}

export const STANDARD_SHIPPING_THRESHOLD = DEFAULT_SHIPPING_RATES.freeThreshold
export const STANDARD_SHIPPING_COST = DEFAULT_SHIPPING_RATES.standardCost
export const EXPRESS_SHIPPING_COST = DEFAULT_SHIPPING_RATES.expressCost

export interface ShippingCostOptions {
  /** Pedido compuesto solo por productos digitales (tarjetas de regalo): sin envío. */
  digitalOnly?: boolean
  /** Tarifas vigentes. Si no llegan, se usan los valores de respaldo. */
  rates?: ShippingRates
}

export function getShippingCost(
  method: ShippingMethod,
  subtotal: number,
  options: ShippingCostOptions = {}
): number {
  const rates = options.rates ?? DEFAULT_SHIPPING_RATES
  if (options.digitalOnly) return 0
  if (method === "express") return rates.expressCost
  return subtotal >= rates.freeThreshold ? 0 : rates.standardCost
}
