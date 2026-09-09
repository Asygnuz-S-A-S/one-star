import "server-only"
import * as crypto from "crypto"

export interface EpaycoWebhookPayload {
  x_ref_payco: string
  x_transaction_id: string
  x_amount: string
  x_currency_code: string
  /** 1 = Aceptada, 2 = Rechazada, 3 = Pendiente, 4 = Fallida */
  x_cod_response: string
  x_transaction_state: string
  /**
   * ID de nuestro pedido. Se envía a ePayco como `invoice` en `checkout.open()`
   * y ePayco lo devuelve como `x_id_invoice` (también `x_id_factura`).
   */
  x_invoice: string
  x_signature?: string
}

/** Lo mínimo que un mapa de formulario necesita exponer para ser parseado. */
interface FormDataLike {
  get: (name: string) => FormDataEntryValue | null
}

function readField(formData: FormDataLike, ...names: string[]): string {
  for (const name of names) {
    const value = formData.get(name)
    if (value !== null && value !== undefined && String(value) !== "") {
      return String(value)
    }
  }
  return ""
}

/**
 * Normaliza el formulario que ePayco envía por POST a la URL de confirmación.
 *
 * ePayco NO envía un campo `x_invoice`: la factura viaja como `x_id_invoice`
 * (y `x_id_factura` en documentación antigua). Leer solo `x_invoice` hacía que
 * el webhook respondiera 400 "Missing invoice" para TODAS las confirmaciones
 * y ningún pedido pasara a PAID.
 */
export function parseEpaycoWebhookPayload(formData: FormDataLike): EpaycoWebhookPayload {
  return {
    x_ref_payco: readField(formData, "x_ref_payco"),
    x_transaction_id: readField(formData, "x_transaction_id"),
    x_amount: readField(formData, "x_amount"),
    x_currency_code: readField(formData, "x_currency_code"),
    x_cod_response: readField(formData, "x_cod_response"),
    x_transaction_state: readField(formData, "x_transaction_state"),
    x_invoice: readField(formData, "x_id_invoice", "x_id_factura", "x_invoice"),
    x_signature: readField(formData, "x_signature"),
  }
}

/**
 * Verifica la firma del webhook de ePayco.
 * Fórmula: SHA256(customerId^privateKey^ref_payco^transaction_id^amount^currency)
 *
 * El algoritmo es SHA256, no MD5: ePayco envía `x_signature` como 64 caracteres
 * hexadecimales. Con MD5 el digest mide 32 y la comparación falla siempre, lo
 * que rechaza TODAS las confirmaciones legítimas y deja los pedidos en PENDING.
 */
export function verifyEpaycoSignature(payload: EpaycoWebhookPayload): boolean {
  const customerId = process.env.EPAYCO_CUSTOMER_ID
  const privateKey = process.env.EPAYCO_PRIVATE_KEY
  if (!customerId || !privateKey || !payload.x_signature) return false

  const expected = crypto
    .createHash("sha256")
    .update(
      `${customerId}^${privateKey}^${payload.x_ref_payco}^${payload.x_transaction_id}^${payload.x_amount}^${payload.x_currency_code}`
    )
    .digest("hex")

  // Comparación en tiempo constante para no filtrar la firma por timing.
  const expectedBuf = Buffer.from(expected, "utf8")
  const receivedBuf = Buffer.from(payload.x_signature, "utf8")
  if (expectedBuf.length !== receivedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, receivedBuf)
}

export const EpaycoStatus = {
  ACCEPTED: "1",
  REJECTED: "2",
  PENDING: "3",
  FAILED: "4",
} as const

/** Endpoint público de ePayco para consultar una transacción por `ref_payco`. */
const EPAYCO_VALIDATION_URL = "https://secure.epayco.co/validation/v1/reference/"
const EPAYCO_VALIDATION_TIMEOUT_MS = 10_000
const REF_PAYCO_PATTERN = /^[A-Za-z0-9_-]{6,64}$/

/** Transacción tal como la devuelve la consulta por referencia, ya normalizada. */
export interface EpaycoTransaction {
  refPayco: string
  transactionId: string
  invoice: string
  amount: string
  currencyCode: string
  codResponse: string
  transactionState: string
}

interface EpaycoValidationResponse {
  success?: boolean
  data?: Record<string, unknown>
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

/**
 * Consulta a ePayco el resultado de una transacción a partir del `ref_payco`
 * con el que la pasarela redirige a la página de respuesta.
 *
 * La respuesta viene del servidor de ePayco (no del navegador del cliente),
 * así que es una fuente confiable para confirmar un pago cuando el webhook
 * todavía no llegó. Devuelve `null` si la referencia no existe o el servicio
 * no responde; nunca lanza.
 */
export async function fetchEpaycoTransaction(refPayco: string): Promise<EpaycoTransaction | null> {
  if (!REF_PAYCO_PATTERN.test(refPayco)) return null

  try {
    const response = await fetch(`${EPAYCO_VALIDATION_URL}${encodeURIComponent(refPayco)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(EPAYCO_VALIDATION_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) {
      console.error(`[epayco] Consulta de referencia ${refPayco} respondió ${response.status}`)
      return null
    }
    const body = (await response.json()) as EpaycoValidationResponse
    if (!body.success || !body.data) return null

    const data = body.data
    return {
      refPayco: asString(data.x_ref_payco) || refPayco,
      transactionId: asString(data.x_transaction_id),
      invoice: asString(data.x_id_invoice) || asString(data.x_id_factura),
      amount: asString(data.x_amount),
      currencyCode: asString(data.x_currency_code),
      codResponse: asString(data.x_cod_response),
      transactionState: asString(data.x_transaction_state),
    }
  } catch (error) {
    console.error(`[epayco] No se pudo consultar la referencia ${refPayco}:`, error)
    return null
  }
}
