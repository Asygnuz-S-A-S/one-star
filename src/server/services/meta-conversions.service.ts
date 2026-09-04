import "server-only"

import { createHash } from "node:crypto"
import { getMetaConversionsCredentials } from "@/server/services/store-settings.service"
import type { OrderDTO } from "@/server/services/order.service"

/**
 * API de Conversiones de Meta (server-side). Complementa al píxel del
 * navegador: el `Purchase` se envía desde el webhook de pago, que es la única
 * fuente confiable de que el pedido se pagó. Ambos eventos comparten
 * `event_id` = id del pedido para que Meta los deduplique.
 */

const GRAPH_API_VERSION = "v21.0"
const GRAPH_API_BASE = "https://graph.facebook.com"
const REQUEST_TIMEOUT_MS = 8_000
const CURRENCY = "COP"
const COLOMBIA_COUNTRY_CODE = "57"
const COLOMBIA_MOBILE_LENGTH = 10

export interface MetaPurchaseInput {
  orderId: string
  total: number
  email: string | null
  fullName: string | null
  phone: string | null
  userId: string | null
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
  /** Fecha de pago; por defecto ahora. */
  eventTime?: Date
}

export interface MetaConversionsPayload {
  data: Array<{
    event_name: "Purchase"
    event_time: number
    event_id: string
    action_source: "website"
    event_source_url?: string
    user_data: Record<string, string[] | string>
    custom_data: {
      currency: string
      value: number
      content_type: "product"
      content_ids: string[]
      contents: Array<{ id: string; quantity: number; item_price: number }>
      num_items: number
      order_id: string
    }
  }>
  test_event_code?: string
}

export type MetaSendResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "request-failed" | "http-error"; detail?: string }

/** Meta exige SHA-256 sobre el valor normalizado (minúsculas, sin espacios). */
export function hashForMeta(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

/** Solo dígitos con indicativo. Un celular colombiano de 10 dígitos recibe el 57. */
export function normalizePhoneForMeta(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 7) return null
  if (digits.length === COLOMBIA_MOBILE_LENGTH && digits.startsWith("3")) {
    return `${COLOMBIA_COUNTRY_CODE}${digits}`
  }
  return digits
}

function splitName(fullName: string): { first: string | null; last: string | null } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first: null, last: null }
  return { first: parts[0], last: parts.length > 1 ? parts.slice(1).join(" ") : null }
}

function buildUserData(input: MetaPurchaseInput): Record<string, string[] | string> {
  const userData: Record<string, string[] | string> = {}
  if (input.email) userData.em = [hashForMeta(input.email)]
  const phone = input.phone ? normalizePhoneForMeta(input.phone) : null
  if (phone) userData.ph = [hashForMeta(phone)]
  if (input.fullName) {
    const { first, last } = splitName(input.fullName)
    if (first) userData.fn = [hashForMeta(first)]
    if (last) userData.ln = [hashForMeta(last)]
  }
  if (input.userId) userData.external_id = [hashForMeta(input.userId)]
  userData.country = [hashForMeta("co")]
  return userData
}

export function buildPurchasePayload(
  input: MetaPurchaseInput,
  options: { testEventCode?: string | null; sourceUrl?: string | null } = {},
): MetaConversionsPayload {
  const contents = input.items.map((item) => ({
    id: item.productId,
    quantity: item.quantity,
    item_price: item.unitPrice,
  }))
  const eventTime = Math.floor((input.eventTime ?? new Date()).getTime() / 1000)

  const payload: MetaConversionsPayload = {
    data: [
      {
        event_name: "Purchase",
        event_time: eventTime,
        event_id: input.orderId,
        action_source: "website",
        ...(options.sourceUrl ? { event_source_url: options.sourceUrl } : {}),
        user_data: buildUserData(input),
        custom_data: {
          currency: CURRENCY,
          value: input.total,
          content_type: "product",
          content_ids: contents.map((content) => content.id),
          contents,
          num_items: contents.reduce((sum, content) => sum + content.quantity, 0),
          order_id: input.orderId,
        },
      },
    ],
  }
  if (options.testEventCode) payload.test_event_code = options.testEventCode
  return payload
}

function readShippingPhone(shippingAddress: unknown): string | null {
  if (!shippingAddress || typeof shippingAddress !== "object") return null
  const phone = (shippingAddress as { phone?: unknown }).phone
  return typeof phone === "string" && phone.length > 0 ? phone : null
}

export function purchaseInputFromOrder(order: OrderDTO): MetaPurchaseInput {
  return {
    orderId: order.id,
    total: order.total,
    email: order.customerEmail ?? order.userEmail,
    fullName: order.customerName,
    phone: readShippingPhone(order.shippingAddress),
    userId: order.userId,
    items: (order.items ?? []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
  }
}

function successPageUrl(): string | null {
  const base = process.env.BETTER_AUTH_URL
  return base ? `${base.replace(/\/$/, "")}/checkout/success` : null
}

export async function sendMetaPurchaseEvent(input: MetaPurchaseInput): Promise<MetaSendResult> {
  const credentials = await getMetaConversionsCredentials()
  if (!credentials) return { sent: false, reason: "not-configured" }

  const payload = buildPurchasePayload(input, {
    testEventCode: credentials.testEventCode,
    sourceUrl: successPageUrl(),
  })
  const url = `${GRAPH_API_BASE}/${GRAPH_API_VERSION}/${credentials.pixelId}/events`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: credentials.accessToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => "")
      console.error(
        `[meta-capi] Purchase ${input.orderId} rechazado (HTTP ${response.status}): ${detail}`,
      )
      return { sent: false, reason: "http-error", detail }
    }
    return { sent: true }
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(`[meta-capi] Purchase ${input.orderId} no enviado: ${detail}`)
    return { sent: false, reason: "request-failed", detail }
  }
}

/** Atajo para el webhook: construye el evento desde el pedido ya cargado. */
export async function sendMetaPurchaseForOrder(order: OrderDTO): Promise<MetaSendResult> {
  return sendMetaPurchaseEvent(purchaseInputFromOrder(order))
}
