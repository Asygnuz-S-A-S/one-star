import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import * as crypto from "crypto"

vi.mock("server-only", () => ({}))

import {
  EpaycoStatus,
  verifyEpaycoSignature,
  type EpaycoWebhookPayload,
} from "../epayco.service"

const CUSTOMER_ID = "123456"
const PRIVATE_KEY = "clave-privada-de-prueba"

const basePayload: Omit<EpaycoWebhookPayload, "x_signature"> = {
  x_ref_payco: "987654321",
  x_transaction_id: "tx-0001",
  x_amount: "150000.00",
  x_currency_code: "COP",
  x_cod_response: "1",
  x_transaction_state: "Aceptada",
  x_invoice: "order-abc",
}

/** Firma tal como la calcula ePayco al llamar la confirmation_url. */
function signLikeEpayco(payload: Omit<EpaycoWebhookPayload, "x_signature">): string {
  return crypto
    .createHash("sha256")
    .update(
      `${CUSTOMER_ID}^${PRIVATE_KEY}^${payload.x_ref_payco}^${payload.x_transaction_id}^${payload.x_amount}^${payload.x_currency_code}`
    )
    .digest("hex")
}

describe("verifyEpaycoSignature", () => {
  beforeEach(() => {
    process.env.EPAYCO_CUSTOMER_ID = CUSTOMER_ID
    process.env.EPAYCO_PRIVATE_KEY = PRIVATE_KEY
  })

  afterEach(() => {
    delete process.env.EPAYCO_CUSTOMER_ID
    delete process.env.EPAYCO_PRIVATE_KEY
  })

  it("acepta la firma SHA256 que envía ePayco", () => {
    const payload = { ...basePayload, x_signature: signLikeEpayco(basePayload) }

    expect(verifyEpaycoSignature(payload)).toBe(true)
  })

  it("produce un digest de 64 caracteres hexadecimales, no de 32", () => {
    // Blindaje contra la regresión que lo calculaba con MD5: el digest medía 32
    // caracteres, nunca coincidía con el de ePayco y todos los pagos legítimos
    // quedaban rechazados con 401.
    const signature = signLikeEpayco(basePayload)

    expect(signature).toHaveLength(64)
    expect(verifyEpaycoSignature({ ...basePayload, x_signature: signature })).toBe(true)
  })

  it("rechaza una firma MD5 con los mismos datos", () => {
    const md5Signature = crypto
      .createHash("md5")
      .update(
        `${CUSTOMER_ID}^${PRIVATE_KEY}^${basePayload.x_ref_payco}^${basePayload.x_transaction_id}^${basePayload.x_amount}^${basePayload.x_currency_code}`
      )
      .digest("hex")

    expect(verifyEpaycoSignature({ ...basePayload, x_signature: md5Signature })).toBe(false)
  })

  it("rechaza el pago si el monto fue manipulado tras firmar", () => {
    const signature = signLikeEpayco(basePayload)

    expect(
      verifyEpaycoSignature({ ...basePayload, x_amount: "1.00", x_signature: signature })
    ).toBe(false)
  })

  it("rechaza el pago si la moneda fue manipulada tras firmar", () => {
    const signature = signLikeEpayco(basePayload)

    expect(
      verifyEpaycoSignature({ ...basePayload, x_currency_code: "USD", x_signature: signature })
    ).toBe(false)
  })

  it("rechaza cuando falta la firma", () => {
    expect(verifyEpaycoSignature({ ...basePayload })).toBe(false)
  })

  it("rechaza cuando no hay credenciales configuradas", () => {
    delete process.env.EPAYCO_PRIVATE_KEY
    const payload = { ...basePayload, x_signature: signLikeEpayco(basePayload) }

    expect(verifyEpaycoSignature(payload)).toBe(false)
  })

  it("rechaza una firma emitida con la llave privada de otro comercio", () => {
    const signature = crypto
      .createHash("sha256")
      .update(
        `${CUSTOMER_ID}^llave-de-otro-comercio^${basePayload.x_ref_payco}^${basePayload.x_transaction_id}^${basePayload.x_amount}^${basePayload.x_currency_code}`
      )
      .digest("hex")

    expect(verifyEpaycoSignature({ ...basePayload, x_signature: signature })).toBe(false)
  })

  it("rechaza una firma de longitud distinta sin reventar la comparación", () => {
    // timingSafeEqual lanza si los buffers no miden lo mismo: la guarda de
    // longitud debe atajarlo antes de llamarlo.
    expect(() =>
      verifyEpaycoSignature({ ...basePayload, x_signature: "abc" })
    ).not.toThrow()
    expect(verifyEpaycoSignature({ ...basePayload, x_signature: "abc" })).toBe(false)
  })

  it("rechaza cuando falta el identificador de comercio", () => {
    delete process.env.EPAYCO_CUSTOMER_ID

    expect(
      verifyEpaycoSignature({ ...basePayload, x_signature: signLikeEpayco(basePayload) })
    ).toBe(false)
  })
})

describe("EpaycoStatus", () => {
  it("mantiene los códigos de respuesta que documenta ePayco", () => {
    expect(EpaycoStatus).toEqual({
      ACCEPTED: "1",
      REJECTED: "2",
      PENDING: "3",
      FAILED: "4",
    })
  })
})
