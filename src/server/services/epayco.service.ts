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
  /** ID de nuestro pedido (pasado como data-epayco-invoice) */
  x_invoice: string
  x_signature?: string
}

/**
 * Verifica la firma MD5 del webhook de ePayco.
 * Fórmula: MD5(customerId^privateKey^ref_payco^transaction_id^amount^currency)
 */
export function verifyEpaycoSignature(payload: EpaycoWebhookPayload): boolean {
  const customerId = process.env.EPAYCO_CUSTOMER_ID
  const privateKey = process.env.EPAYCO_PRIVATE_KEY
  if (!customerId || !privateKey || !payload.x_signature) return false

  const expected = crypto
    .createHash("md5")
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
