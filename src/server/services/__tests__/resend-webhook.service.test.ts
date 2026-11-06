import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const verify = vi.hoisted(() => vi.fn())
const client = vi.hoisted(() => ({ value: null as unknown }))
vi.mock("@/server/email/resend.client", () => ({ getResendClient: () => client.value }))
const processUnsubscribeEmail = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/unsubscribe.service", () => ({ processUnsubscribeEmail }))

import { handleResendWebhook } from "../resend-webhook.service"

const headers = { id: "msg_1", timestamp: "1730000000", signature: "v1,abc" }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_test")
  client.value = { webhooks: { verify } }
})

describe("handleResendWebhook", () => {
  it("sin secreto no acepta eventos (fail-closed)", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "")
    expect(await handleResendWebhook("{}", headers)).toBe("not_configured")
    expect(verify).not.toHaveBeenCalled()
  })

  it("rechaza firmas inválidas o encabezados faltantes", async () => {
    verify.mockImplementation(() => {
      throw new Error("bad signature")
    })
    expect(await handleResendWebhook("{}", headers)).toBe("invalid_signature")
    expect(await handleResendWebhook("{}", { ...headers, signature: null })).toBe("invalid_signature")
    expect(processUnsubscribeEmail).not.toHaveBeenCalled()
  })

  it("una baja en Resend retira el consentimiento sin avisar de vuelta a Resend", async () => {
    verify.mockReturnValue({ type: "contact.updated", data: { email: "ana@x.co", unsubscribed: true } })
    expect(await handleResendWebhook("{}", headers)).toBe("unsubscribed")
    expect(processUnsubscribeEmail).toHaveBeenCalledWith("ana@x.co", { fromResend: true })
  })

  it("una queja de spam también es una baja", async () => {
    verify.mockReturnValue({ type: "email.complained", data: { to: ["ana@x.co"] } })
    expect(await handleResendWebhook("{}", headers)).toBe("unsubscribed")
    expect(processUnsubscribeEmail).toHaveBeenCalledWith("ana@x.co", { fromResend: true })
  })

  it("otros eventos se ignoran", async () => {
    verify.mockReturnValue({ type: "contact.updated", data: { email: "ana@x.co", unsubscribed: false } })
    expect(await handleResendWebhook("{}", headers)).toBe("ignored")
    expect(processUnsubscribeEmail).not.toHaveBeenCalled()
  })
})
