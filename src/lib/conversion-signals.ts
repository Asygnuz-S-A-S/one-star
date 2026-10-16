import { STANDARD_SHIPPING_THRESHOLD } from "@/lib/shipping"
import { formatCOP } from "@/lib/shop-utils"

/**
 * Mensajes de confianza y urgencia de la ficha de producto (HU-12).
 *
 * Todos salen de datos reales: el umbral de envío gratis, el plazo de entrega
 * publicado y el stock de la variante. Nada se inventa: si no hay dato, no hay
 * mensaje. Se limita a pocos mensajes para no saturar la ficha.
 */

/** Plazo de entrega publicado en "Envío y devoluciones". */
export const DELIVERY_BUSINESS_DAYS = { min: 3, max: 5 } as const

/** A partir de cuántas unidades (inclusive) se avisa que quedan pocas. */
export const LOW_STOCK_THRESHOLD = 3

/** Máximo de mensajes visibles a la vez. */
export const MAX_CONVERSION_SIGNALS = 3

export type ConversionSignalKind = "shipping" | "delivery" | "scarcity"

export interface ConversionSignal {
  kind: ConversionSignalKind
  text: string
  /** `urgent` resalta en rojo; `info` es neutro. */
  tone: "info" | "urgent"
}

export interface ConversionSignalsInput {
  /** Precio que pagaría el cliente por una unidad (oferta si la hay). */
  price: number
  /** Stock de la talla elegida; `null` cuando aún no eligió talla. */
  selectedVariantStock: number | null
  /** Talla elegida, para nombrarla en el aviso. */
  selectedSize?: string | null
  /** Suma del stock de todas las tallas del color en pantalla. */
  totalStock: number
  /** Producto digital (tarjeta de regalo): no aplica envío ni escasez. */
  isDigital?: boolean
}

export function getConversionSignals(input: ConversionSignalsInput): ConversionSignal[] {
  if (input.isDigital) return []

  const signals: ConversionSignal[] = []

  const scarcity = getScarcitySignal(input)
  if (scarcity) signals.push(scarcity)

  signals.push(getShippingSignal(input.price))
  signals.push({
    kind: "delivery",
    text: `Entrega en ${DELIVERY_BUSINESS_DAYS.min} a ${DELIVERY_BUSINESS_DAYS.max} días hábiles en toda Colombia`,
    tone: "info",
  })

  return signals.slice(0, MAX_CONVERSION_SIGNALS)
}

function getShippingSignal(price: number): ConversionSignal {
  if (price >= STANDARD_SHIPPING_THRESHOLD) {
    return { kind: "shipping", text: "Envío gratis en este producto", tone: "info" }
  }
  const missing = STANDARD_SHIPPING_THRESHOLD - price
  return {
    kind: "shipping",
    text: `Te faltan ${formatCOP(missing)} para el envío gratis`,
    tone: "info",
  }
}

function getScarcitySignal(input: ConversionSignalsInput): ConversionSignal | null {
  const { selectedVariantStock, selectedSize, totalStock } = input

  if (selectedVariantStock !== null) {
    if (selectedVariantStock <= 0) return null
    if (selectedVariantStock === 1) {
      return {
        kind: "scarcity",
        text: selectedSize ? `Última unidad en talla ${selectedSize}` : "Última unidad disponible",
        tone: "urgent",
      }
    }
    if (selectedVariantStock <= LOW_STOCK_THRESHOLD) {
      return {
        kind: "scarcity",
        text: selectedSize
          ? `Solo quedan ${selectedVariantStock} en talla ${selectedSize}`
          : `Solo quedan ${selectedVariantStock} unidades`,
        tone: "urgent",
      }
    }
    return null
  }

  if (totalStock > 0 && totalStock <= LOW_STOCK_THRESHOLD) {
    return { kind: "scarcity", text: "Quedan pocas unidades", tone: "urgent" }
  }
  return null
}
