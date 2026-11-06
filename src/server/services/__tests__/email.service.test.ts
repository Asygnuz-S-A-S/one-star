import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const sendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, id: "e1" }))
vi.mock("@/server/email/resend.client", () => ({ sendEmail }))
const getEmailSettings = vi.hoisted(() => vi.fn())
vi.mock("@/server/services/email-settings.service", () => ({ getEmailSettings }))
vi.mock("@/server/services/store-settings.service", () => ({ getClubCopy: vi.fn().mockResolvedValue(null) }))
vi.mock("@/server/services/unsubscribe.service", () => ({ createUnsubscribeToken: () => "tok" }))

import {
  sendClubWelcomeEmail,
  sendLoginAlertEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendPaymentRejectedEmail,
} from "../email.service"

beforeEach(() => vi.clearAllMocks())

describe("interruptor de los correos automáticos", () => {
  it("un correo apagado no se envía", async () => {
    getEmailSettings.mockResolvedValue({ enabled: false, copy: {} })
    expect(await sendLoginAlertEmail({ email: "a@b.co" })).toEqual({ success: true })
    expect(await sendOrderShippedEmail({ email: "a@b.co", orderId: "o1" })).toEqual({ success: true })
    expect(await sendPaymentRejectedEmail({ email: "a@b.co", orderId: "o1" })).toEqual({ success: true })
    expect(await sendClubWelcomeEmail({ email: "a@b.co", newsletter: false })).toEqual({ success: true })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("un correo encendido sale con el asunto guardado en el admin", async () => {
    getEmailSettings.mockResolvedValue({ enabled: true, copy: { subject: "Va en camino, {nombre}" } })
    await sendOrderShippedEmail({ email: "a@b.co", name: "Laura Gómez", orderId: "o1" })
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@b.co", subject: "Va en camino, Laura" }))
  })

  it("la confirmación de pedido usa los textos guardados", async () => {
    getEmailSettings.mockResolvedValue({ enabled: true, copy: { subject: "Pedido #{pedido}" } })
    await sendOrderConfirmationEmail({ email: "a@b.co", orderId: "cm000abcd1234", items: [], total: 0 })
    expect(getEmailSettings).toHaveBeenCalledWith("order_confirmation")
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: "Pedido #ABCD1234" }))
  })
})
