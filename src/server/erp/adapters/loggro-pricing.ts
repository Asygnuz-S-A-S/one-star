import "server-only"

/**
 * Loggro entrega el precio de venta SIN IVA (es el subtotal que factura).
 * El contrato `ERPCatalogSnapshot.basePrice` es el precio final que paga el
 * cliente, así que este adaptador le suma el IVA antes de entregarlo al core.
 *
 * La tasa sale, en este orden, de:
 *   1. `ivaVenta` del ítem de Loggro (porcentaje por ítem, ej. "19.00").
 *   2. `ivaVenta` de la definición padre del ítem.
 *   3. `LOGGRO_IVA_RATE` (tasa global de respaldo, default 19 %).
 *
 * Los bonos de regalo no pasan por aquí: no viven en Loggro, se siembran en la
 * web con su valor nominal y no llevan IVA en la compra.
 */

/** IVA general en Colombia. Se puede ajustar con `LOGGRO_IVA_RATE`. */
export const DEFAULT_LOGGRO_IVA_RATE = 0.19

const MAX_IVA_RATE = 1
const PERCENT_DIVISOR = 100

/**
 * Convierte un valor crudo ("19.00", "0,05", 19, 0.19) en una tasa (0.19).
 * Los valores >= 1 se leen como porcentaje; los menores, como fracción.
 * Devuelve `undefined` cuando el valor falta, no es numérico o está fuera
 * del rango [0, 100 %).
 */
function parseIvaRate(raw: string | number | null | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined
  const text = String(raw).trim()
  if (text === "") return undefined
  const parsed = Number(text.replace(",", "."))
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  const rate = parsed >= MAX_IVA_RATE ? parsed / PERCENT_DIVISOR : parsed
  if (!Number.isFinite(rate) || rate < 0 || rate >= MAX_IVA_RATE) return undefined
  return rate
}

/**
 * Lee la tasa de IVA global desde el entorno. Acepta "0.19" o "19" (porcentaje).
 * Un valor ausente usa el 19 %; un valor inválido o fuera de rango también,
 * para no publicar precios netos por un error de configuración.
 */
export function resolveLoggroIvaRate(raw: string | undefined = process.env.LOGGRO_IVA_RATE): number {
  return parseIvaRate(raw) ?? DEFAULT_LOGGRO_IVA_RATE
}

/**
 * Lee la tasa de IVA propia de un ítem de Loggro a partir de su campo
 * `ivaVenta` (porcentaje, ej. "19.00", "5.00", "0"). Devuelve `undefined`
 * cuando falta o es inválido, para que el normalizador caiga a la tasa global.
 * "0" es válido: identifica un ítem exento.
 */
export function parseLoggroItemIvaRate(
  ivaVenta: string | number | null | undefined
): number | undefined {
  return parseIvaRate(ivaVenta)
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
