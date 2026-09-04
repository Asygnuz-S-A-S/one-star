/**
 * Helpers del píxel de Meta seguros para el cliente (sin `server-only`).
 * Todo pasa por `window.fbq`; si el píxel no está cargado (deshabilitado,
 * bloqueado por el navegador, admin) las llamadas son no-op.
 */

export type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase"

export interface MetaContent {
  id: string
  quantity: number
  item_price?: number
}

export interface MetaEventParams {
  content_ids?: string[]
  content_type?: "product"
  contents?: MetaContent[]
  content_name?: string
  content_category?: string
  value?: number
  currency?: string
  num_items?: number
}

export interface MetaEventOptions {
  /**
   * Identificador compartido con el evento server-side para que Meta
   * deduplique (mismo event_name + event_id). Para Purchase usamos el id del pedido.
   */
  eventId?: string
}

export const META_CURRENCY = "COP"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export function isMetaPixelLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function"
}

/** Devuelve `true` si el evento se entregó a fbq; `false` si no hay píxel. */
export function trackMetaEvent(
  event: MetaStandardEvent,
  params: MetaEventParams = {},
  options: MetaEventOptions = {},
): boolean {
  if (!isMetaPixelLoaded()) return false
  if (options.eventId) {
    window.fbq!("track", event, params, { eventID: options.eventId })
  } else {
    window.fbq!("track", event, params)
  }
  return true
}

export interface TrackableLineItem {
  productId: string
  quantity: number
  price: number
}

/** Convierte líneas de carrito/pedido al formato `contents` + totales de Meta. */
export function buildMetaCommerceParams(items: TrackableLineItem[]): MetaEventParams {
  const contents = items.map((item) => ({
    id: item.productId,
    quantity: item.quantity,
    item_price: item.price,
  }))
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const numItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    content_type: "product",
    content_ids: contents.map((content) => content.id),
    contents,
    value: roundCurrency(value),
    currency: META_CURRENCY,
    num_items: numItems,
  }
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}
