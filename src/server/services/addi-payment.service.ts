import "server-only"
import { timingSafeEqual } from "node:crypto"
import { EpaycoStatus } from "./epayco.service"
import type { OrderDTO } from "./order.service"

/**
 * Pago con Addi (crédito). Especificación: Swagger de Addi v1
 * (`/oauth/token`, `/v1/online-applications`) y callback con Basic auth.
 * Producción: ADDI_AUTH_URL=https://auth.addi.com, ADDI_API_URL=https://api.addi.com.
 */

interface AddiCredentials {
  authUrl: string
  apiUrl: string
  audience: string
  clientId: string
  clientSecret: string
}

/** Fail-closed: sin todas las variables no se habla con Addi. */
export function getAddiCredentials(): AddiCredentials | null {
  const authUrl = process.env.ADDI_AUTH_URL?.trim().replace(/\/+$/, "")
  const apiUrl = process.env.ADDI_API_URL?.trim().replace(/\/+$/, "")
  const clientId = process.env.ADDI_CLIENT_ID?.trim()
  const clientSecret = process.env.ADDI_CLIENT_SECRET?.trim()
  if (!authUrl || !apiUrl || !clientId || !clientSecret) return null
  // El audience de staging no coincide con su host (api.staging.addi.com vs api.addi-staging.com).
  const audience = process.env.ADDI_AUDIENCE?.trim() || apiUrl
  return { authUrl, apiUrl, audience, clientId, clientSecret }
}

/** Montos como string con decimal, como pide Addi. */
function money(value: number): string {
  return value.toFixed(2)
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts.shift() ?? ""
  return { firstName, lastName: parts.join(" ") || firstName }
}

/** Celular colombiano de 10 dígitos, sin indicativo. */
function localCellphone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits
}

export interface AddiApplicationBody {
  orderId: string
  totalAmount: string
  shippingAmount: string
  currency: "COP"
  items: { sku: string; name: string; quantity: string; unitPrice: string }[]
  client: {
    idType: "CC"
    idNumber: string
    firstName: string
    lastName: string
    email: string
    cellphone: string
    cellphoneCountryCode: "+57"
    address: { lineOne: string; city: string; country: "CO" }
  }
  allyUrlRedirection: { callbackUrl: string; redirectionUrl: string }
}

/** Arma la solicitud con los datos guardados del pedido (nunca con los del navegador). */
export function buildAddiApplication(
  order: OrderDTO,
  siteUrl: string,
  guestToken?: string
): AddiApplicationBody {
  const address = (order.shippingAddress ?? {}) as Record<string, unknown>
  const text = (key: string) => (typeof address[key] === "string" ? (address[key] as string) : "")
  const items = order.items ?? []
  const itemsTotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  // shortcut: Order no guarda el envío; se deduce del total. Con cupón da 0. Guardar shippingCost en Order si Addi lo exige exacto.
  const shippingAmount = Math.max(0, order.total - itemsTotal)

  const success = new URL("/checkout/success", siteUrl)
  success.searchParams.set("orderId", order.id)
  if (guestToken) success.searchParams.set("token", guestToken)

  return {
    orderId: order.id,
    totalAmount: money(order.total),
    shippingAmount: money(shippingAmount),
    currency: "COP",
    items: items.map((item) => ({
      sku: item.sku ?? item.productId,
      name: item.productName,
      quantity: String(item.quantity),
      unitPrice: money(item.unitPrice),
    })),
    client: {
      idType: "CC",
      idNumber: order.customerDocument ?? "",
      ...splitName(order.customerName ?? ""),
      email: order.customerEmail ?? "",
      cellphone: localCellphone(order.customerPhone ?? text("phone")),
      cellphoneCountryCode: "+57",
      address: {
        lineOne: [text("address"), text("apartment")].filter(Boolean).join(", "),
        city: text("city"),
        country: "CO",
      },
    },
    allyUrlRedirection: {
      callbackUrl: new URL("/api/addi/callback", siteUrl).toString(),
      redirectionUrl: success.toString(),
    },
  }
}

export type AddiApplicationResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; reason: "not_configured" | "client_has_credit" | "rejected_request" | "unavailable" }

const TIMEOUT_MS = 10_000

async function fetchAccessToken(credentials: AddiCredentials): Promise<string | null> {
  const response = await fetch(`${credentials.authUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: credentials.audience,
      grant_type: "client_credentials",
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  })
  if (!response.ok) {
    console.error(`[addi] Token rechazado: HTTP ${response.status}`)
    return null
  }
  const data = (await response.json()) as { access_token?: unknown }
  return typeof data.access_token === "string" ? data.access_token : null
}

/**
 * Crea la solicitud de crédito y devuelve la URL de Addi a la que se redirige
 * al cliente. Addi responde 301 sin body con la URL en `Location`.
 */
export async function createAddiApplication(body: AddiApplicationBody): Promise<AddiApplicationResult> {
  const credentials = getAddiCredentials()
  if (!credentials) return { ok: false, reason: "not_configured" }

  try {
    const token = await fetchAccessToken(credentials)
    if (!token) return { ok: false, reason: "unavailable" }

    const response = await fetch(`${credentials.apiUrl}/v1/online-applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })

    const location = response.headers.get("location")
    if (response.status >= 300 && response.status < 400 && location?.startsWith("https://")) {
      return { ok: true, redirectUrl: location }
    }
    if (response.status === 409) return { ok: false, reason: "client_has_credit" }
    console.error(`[addi] Solicitud ${body.orderId} no creada: HTTP ${response.status}`)
    return { ok: false, reason: response.status === 400 ? "rejected_request" : "unavailable" }
  } catch (error) {
    console.error(`[addi] Error creando la solicitud ${body.orderId}:`, error)
    return { ok: false, reason: "unavailable" }
  }
}

/** Traduce el estado de Addi al código que entiende applyPaymentNotification. */
export function addiStatusToPaymentCode(status: string): string {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return EpaycoStatus.ACCEPTED
    case "REJECTED":
    case "DECLINED":
    case "ABANDONED":
      return EpaycoStatus.REJECTED
    case "INTERNAL_ERROR":
      return EpaycoStatus.FAILED
    default:
      // PENDING u otro: el pedido sigue esperando.
      return EpaycoStatus.PENDING
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Valida el Basic auth del callback con las credenciales de notificación.
 * Devuelve null si no están configuradas (el callback debe fallar cerrado).
 */
export function verifyAddiCallbackAuth(authorization: string | null): boolean | null {
  const user = process.env.ADDI_CALLBACK_USER
  const password = process.env.ADDI_CALLBACK_PASSWORD
  if (!user || !password) return null
  if (!authorization?.startsWith("Basic ")) return false
  const expected = Buffer.from(`${user}:${password}`).toString("base64")
  return safeEqual(authorization.slice("Basic ".length).trim(), expected)
}
