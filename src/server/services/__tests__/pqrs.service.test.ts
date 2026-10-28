import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/server/repositories/pqrs.repository", () => ({
  createPqrsRecord: vi.fn(),
  findManyPqrsRecords: vi.fn(),
  findPqrsRecordById: vi.fn(),
  updatePqrsStatusRecord: vi.fn(),
}))
vi.mock("@/server/services/public-rate-limit.service", () => ({
  consumePublicRateLimit: vi.fn(),
}))
vi.mock("@/server/services/email.service", () => ({
  sendPqrsConfirmationEmail: vi.fn().mockResolvedValue({ ok: true }),
  sendPqrsAdminNotificationEmail: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock("@/server/services/store-settings.service", () => ({
  getLegalCompany: vi.fn().mockResolvedValue({
    dataProtectionEmail: "datos@tiendaonestar.com",
    contactEmail: "contacto@tiendaonestar.com",
  }),
}))
vi.mock("@/server/services/unsubscribe.service", () => ({
  processUnsubscribeEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import {
  generatePqrsTicketNumber,
  pqrsInputSchema,
  submitPqrsRequest,
} from "../pqrs.service"
import { createPqrsRecord } from "@/server/repositories/pqrs.repository"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { sendPqrsAdminNotificationEmail, sendPqrsConfirmationEmail } from "@/server/services/email.service"
import { processUnsubscribeEmail } from "@/server/services/unsubscribe.service"
import { calculateBusinessDaysRemaining, getLegalTermBusinessDays } from "@/lib/business-days"

const validPayload = {
  name: "Carlos Mario Duque",
  documentType: "CC" as const,
  documentNumber: "1053800111",
  email: "carlos@example.com",
  phone: "3117654321",
  type: "CONSULTA" as const,
  description: "Deseo conocer qué información personal tienen registrada en mi cuenta y su procedencia.",
}

describe("PQRS Service & Habeas Data", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(consumePublicRateLimit).mockResolvedValue({ allowed: true })
    vi.mocked(createPqrsRecord).mockResolvedValue({
      id: "pqrs-123",
      ticketNumber: "PQR-20261028-A1B2",
      name: validPayload.name,
      documentType: validPayload.documentType,
      documentNumber: validPayload.documentNumber,
      email: validPayload.email,
      phone: validPayload.phone,
      type: validPayload.type,
      description: validPayload.description,
      status: "PENDIENTE",
      responseNotes: null,
      respondedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  })

  it("valida el esquema rechazando datos incompletos o errados", () => {
    // Nombre muy corto
    expect(pqrsInputSchema.safeParse({ ...validPayload, name: "A" }).success).toBe(false)
    // Documento no numérico o corto
    expect(pqrsInputSchema.safeParse({ ...validPayload, documentNumber: "123" }).success).toBe(false)
    // Correo inválido
    expect(pqrsInputSchema.safeParse({ ...validPayload, email: "no-email" }).success).toBe(false)
    // Descripción menor a 10 caracteres
    expect(pqrsInputSchema.safeParse({ ...validPayload, description: "corta" }).success).toBe(false)
    // Tipo no válido
    expect(pqrsInputSchema.safeParse({ ...validPayload, type: "OTRO" }).success).toBe(false)
  })

  it("genera un radicado oficial con formato PQR-YYYYMMDD-XXXX", () => {
    const ticket = generatePqrsTicketNumber()
    expect(ticket).toMatch(/^PQR-\d{8}-[0-9A-F]{4}$/)
  })

  it("calcula los plazos legales correctos (10 días consulta, 15 días reclamo/supresión)", () => {
    expect(getLegalTermBusinessDays("CONSULTA")).toBe(10)
    expect(getLegalTermBusinessDays("RECLAMO")).toBe(15)
    expect(getLegalTermBusinessDays("SUPRESION")).toBe(15)
    expect(getLegalTermBusinessDays("RETIRO_PUBLICIDAD")).toBe(15)

    const now = new Date()
    const info = calculateBusinessDaysRemaining(now, "CONSULTA", now)
    expect(info.maxDays).toBe(10)
    expect(info.elapsedDays).toBe(0)
    expect(info.remainingDays).toBe(10)
    expect(info.isOverdue).toBe(false)
  })

  it("radica la solicitud exitosamente y genera el radicado", async () => {
    const headers = new Headers({ "x-real-ip": "190.158.0.1" })
    const result = await submitPqrsRequest(validPayload, headers)

    expect(result.success).toBe(true)
    expect(result.ticketNumber).toBe("PQR-20261028-A1B2")
    expect(createPqrsRecord).toHaveBeenCalledTimes(1)

    // Dar tiempo para que el fire-and-forget de correos culmine
    await new Promise((r) => setTimeout(r, 10))
    expect(sendPqrsConfirmationEmail).toHaveBeenCalledTimes(1)
    expect(sendPqrsAdminNotificationEmail).toHaveBeenCalledTimes(1)
  })

  it("bloquea por rate limit si se excede el límite de IP", async () => {
    vi.mocked(consumePublicRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 })

    const headers = new Headers({ "x-real-ip": "190.158.0.1" })
    const result = await submitPqrsRequest(validPayload, headers)

    expect(result.success).toBe(false)
    expect(result.code).toBe("RATE_LIMITED")
    expect(result.error).toMatch(/conexión/i)
    expect(createPqrsRecord).not.toHaveBeenCalled()
  })

  it("bloquea por rate limit si se excede el límite por correo", async () => {
    vi.mocked(consumePublicRateLimit)
      .mockResolvedValueOnce({ allowed: true }) // IP pasa
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 }) // Email bloqueado

    const headers = new Headers({ "x-real-ip": "190.158.0.1" })
    const result = await submitPqrsRequest(validPayload, headers)

    expect(result.success).toBe(false)
    expect(result.code).toBe("RATE_LIMITED")
    expect(result.error).toMatch(/correo/i)
    expect(createPqrsRecord).not.toHaveBeenCalled()
  })

  it("ejecuta la baja automática de publicidad cuando el tipo es RETIRO_PUBLICIDAD", async () => {
    const headers = new Headers({ "x-real-ip": "190.158.0.1" })
    const result = await submitPqrsRequest(
      { ...validPayload, type: "RETIRO_PUBLICIDAD", description: "Deseo cancelar mi suscripción a todo mensaje comercial." },
      headers
    )

    expect(result.success).toBe(true)
    expect(processUnsubscribeEmail).toHaveBeenCalledWith("carlos@example.com")
  })
})
