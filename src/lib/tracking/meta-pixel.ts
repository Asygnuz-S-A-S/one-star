/**
 * Helpers del píxel de Meta seguros para el cliente (sin `server-only`).
 * Todo pasa por `window.fbq`; si el píxel no está cargado (deshabilitado,
 * bloqueado por el navegador, admin) las llamadas son no-op.
 *
 * El snippet del píxel se inyecta con `strategy="afterInteractive"`, así que
 * `window.fbq` no existe durante los primeros instantes de la página. Los
 * eventos que se disparan al montar (`ViewContent`, `InitiateCheckout`) caían
 * en esa ventana y se perdían en silencio. Por eso se encolan y se entregan en
 * cuanto el píxel carga; sin consentimiento de cookies no se encola nada.
 */

import { getCookieConsent } from "@/lib/cookies/consent"

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

interface PendingMetaEvent {
  event: MetaStandardEvent
  params: MetaEventParams
  options: MetaEventOptions
}

/** Tope de la cola: si el píxel nunca carga, no crecemos sin límite. */
const MAX_PENDING_EVENTS = 20
/** Cada cuánto revisamos si `window.fbq` ya existe. */
const FLUSH_POLL_MS = 150
/** Pasado este tiempo damos el píxel por no disponible y descartamos la cola. */
const FLUSH_TIMEOUT_MS = 15_000

const pendingEvents: PendingMetaEvent[] = []
let flushTimer: number | null = null
let waitingSince = 0

function sendToFbq(
  event: MetaStandardEvent,
  params: MetaEventParams,
  options: MetaEventOptions,
): void {
  if (options.eventId) {
    window.fbq!("track", event, params, { eventID: options.eventId })
  } else {
    window.fbq!("track", event, params)
  }
}

function stopFlushWatcher(): void {
  if (flushTimer === null || typeof window === "undefined") return
  window.clearInterval(flushTimer)
  flushTimer = null
}

function startFlushWatcher(): void {
  if (flushTimer !== null || typeof window === "undefined") return
  waitingSince = Date.now()
  flushTimer = window.setInterval(() => {
    if (isMetaPixelLoaded()) {
      flushPendingMetaEvents()
      return
    }
    if (Date.now() - waitingSince >= FLUSH_TIMEOUT_MS) {
      pendingEvents.length = 0
      stopFlushWatcher()
    }
  }, FLUSH_POLL_MS)
}

/**
 * Entrega a fbq los eventos encolados mientras el píxel cargaba.
 * Devuelve cuántos se enviaron. Sin píxel no hace nada.
 */
export function flushPendingMetaEvents(): number {
  if (!isMetaPixelLoaded()) return 0
  stopFlushWatcher()
  if (pendingEvents.length === 0) return 0
  const queued = pendingEvents.splice(0, pendingEvents.length)
  for (const pending of queued) {
    sendToFbq(pending.event, pending.params, pending.options)
  }
  return queued.length
}

/** Vacía la cola sin enviar nada (consentimiento revocado, pruebas). */
export function clearPendingMetaEvents(): void {
  pendingEvents.length = 0
  stopFlushWatcher()
}

/** Solo para aserciones en pruebas. */
export function getPendingMetaEventCount(): number {
  return pendingEvents.length
}

/**
 * Devuelve `true` si el evento se entregó a fbq **o quedó encolado** para
 * entregarse en cuanto el píxel cargue; `false` si se descartó (sin
 * consentimiento, fuera del navegador o cola llena).
 */
export function trackMetaEvent(
  event: MetaStandardEvent,
  params: MetaEventParams = {},
  options: MetaEventOptions = {},
): boolean {
  if (isMetaPixelLoaded()) {
    flushPendingMetaEvents()
    sendToFbq(event, params, options)
    return true
  }

  // El píxel todavía no cargó. Encolamos en vez de perder el evento, pero solo
  // con consentimiento: sin él no debe salir nada hacia Meta.
  if (typeof window === "undefined") return false
  if (getCookieConsent() !== "accepted") return false

  if (pendingEvents.length >= MAX_PENDING_EVENTS) pendingEvents.shift()
  pendingEvents.push({ event, params, options })
  startFlushWatcher()
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
