import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import * as crypto from "crypto"

vi.mock("server-only", () => ({}))

import {
  EpaycoStatus,
  verifyEpaycoSignature,
  type EpaycoWebhookPayload,
} from "../epayco.service"

const CUSTOMER_ID = "123456"
const PRIVATE_KEY = "clave-privada-de-prueba"

const basePayload: EpaycoWebhookPayload = {
  x_ref_payco: "ref-987",
  x_transaction_id: "trx-654",
  x_amount: "250000.00",
  x_currency_code: "COP",
  x_cod_response: EpaycoStatus.ACCEPTED,
  x_transaction_state: "Aceptada",
  x_invoice: "order_1",
}

function firmar(payload: EpaycoWebhookPayload, customerId = CUSTOMER_ID, key = PRIVATE_KEY) {
  return crypto
    .createHash("md5")
    .update(
      `${customerId}^${key}^${payload.x_ref_payco}^${payload.x_transaction_id}^${payload.x_amount}^${payload.x_currency_code}`
    )
    .digest("hex")
}

beforeEach(() => {
  process.env.EPAYCO_CUSTOMER_ID = CUSTOMER_ID
  process.env.EPAYCO_PRIVATE_KEY = PRIVATE_KEY
})

afterEach(() => {
  delete process.env.EPAYCO_CUSTOMER_ID
  delete process.env.EPAYCO_PRIVATE_KEY
})

describe("verifyEpaycoSignature", () => {
  it("acepta una firma calculada con la fórmula de ePayco", () => {
    expect(
      verifyEpaycoSignature({ ...basePayload, x_signature: firmar(basePayload) })
    ).toBe(true)
  })

  it("rechaza una firma que no corresponde al payload", () => {
    expect(
      verifyEpaycoSignature({ ...basePayload, x_signature: "0".repeat(32) })
    ).toBe(false)
  })

  it("rechaza el pago si alguien altera el monto después de firmar", () => {
    const signature = firmar(basePayload)

    expect(
      verifyEpaycoSignature({ ...basePayload, x_amount: "1.00", x_signature: signature })
    ).toBe(false)
  })

  it("rechaza una firma emitida con otra llave privada", () => {
    const signature = firmar(basePayload, CUSTOMER_ID, "llave-de-otro-comercio")

    expect(verifyEpaycoSignature({ ...basePayload, x_signature: signature })).toBe(false)
  })

  it("rechaza el webhook cuando no trae firma", () => {
    expect(verifyEpaycoSignature(basePayload)).toBe(false)
  })

  it("rechaza el webhook si el servidor no tiene configuradas las credenciales", () => {
    const signature = firmar(basePayload)

    delete process.env.EPAYCO_PRIVATE_KEY
    expect(verifyEpaycoSignature({ ...basePayload, x_signature: signature })).toBe(false)

    process.env.EPAYCO_PRIVATE_KEY = PRIVATE_KEY
    delete process.env.EPAYCO_CUSTOMER_ID
    expect(verifyEpaycoSignature({ ...basePayload, x_signature: signature })).toBe(false)
  })

  it("rechaza una firma de longitud distinta sin reventar la comparación", () => {
    expect(verifyEpaycoSignature({ ...basePayload, x_signature: "abc" })).toBe(false)
  })
})

describe("EpaycoStatus", () => {
  it("mantiene los códigos que ePayco documenta", () => {
    expect(EpaycoStatus).toEqual({
      ACCEPTED: "1",
      REJECTED: "2",
      PENDING: "3",
      FAILED: "4",
    })
  })
})
