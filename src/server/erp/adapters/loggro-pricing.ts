import "server-only"

/**
 * Loggro entrega el precio de venta SIN IVA (es el subtotal que factura).
 * El contrato `ERPCatalogSnapshot.basePrice` es el precio final que paga el
 * cliente, así que este adaptador le suma el IVA antes de entregarlo al core.
 *
 * Los bonos de regalo no pasan por aquí: no viven en Loggro, se siembran en la
 * web con su valor nominal y no llevan IVA en la compra.
 */

/** IVA general en Colombia. Se puede ajustar con `LOGGRO_IVA_RATE`. */
export const DEFAULT_LOGGRO_IVA_RATE = 0.19

const MAX_IVA_RATE = 1

/**
 * Lee la tasa de IVA desde el entorno. Acepta "0.19" o "19" (porcentaje).
 * Un valor ausente usa el 19 %; un valor inválido o fuera de rango también,
 * para no publicar precios netos por un error de configuración.
 */
export function resolveLoggroIvaRate(raw: string | undefined = process.env.LOGGRO_IVA_RATE): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_LOGGRO_IVA_RATE
  const parsed = Number(raw.trim().replace(",", "."))
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_LOGGRO_IVA_RATE
  const rate = parsed >= MAX_IVA_RATE ? parsed / 100 : parsed
  if (!Number.isFinite(rate) || rate < 0 || rate >= MAX_IVA_RATE) return DEFAULT_LOGGRO_IVA_RATE
  return rate
}

/**
 * Suma el IVA a un precio neto y redondea al peso más cercano.
 * Con tasa 0 devuelve el precio neto intacto.
 */
export function applyIva(netPrice: number, rate: number): number {
  if (!Number.isFinite(netPrice)) return netPrice
  if (rate <= 0) return netPrice
  return Math.round(netPrice * (1 + rate))
}
