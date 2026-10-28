import "server-only"

import { randomBytes } from "node:crypto"
import { z } from "zod"
import { createPqrsRecord, findManyPqrsRecords, findPqrsRecordById, updatePqrsStatusRecord } from "@/server/repositories/pqrs.repository"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { sendPqrsAdminNotificationEmail, sendPqrsConfirmationEmail } from "@/server/services/email.service"
import { getLegalCompany } from "@/server/services/store-settings.service"
import { getLegalTermBusinessDays } from "@/lib/business-days"
import { processUnsubscribeEmail } from "@/server/services/unsubscribe.service"
import type { PqrsStatus, PqrsType } from "@prisma/client"

export const pqrsInputSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(120),
  documentType: z.enum(["CC", "CE", "NIT", "PP"]).default("CC"),
  documentNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,12}$/, "El documento debe tener entre 6 y 12 dígitos"),
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  phone: z.string().trim().max(30).optional(),
  type: z.enum(["CONSULTA", "RECLAMO", "SUPRESION", "RETIRO_PUBLICIDAD"]),
  description: z
    .string()
    .trim()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2500, "La descripción no puede exceder 2500 caracteres"),
})

export type PqrsInput = z.infer<typeof pqrsInputSchema>

export interface SubmitPqrsResult {
  success: boolean
  ticketNumber?: string
  error?: string
  code?: "RATE_LIMITED" | "VALIDATION_ERROR" | "SERVER_ERROR"
}

export function generatePqrsTicketNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const randomSuffix = randomBytes(2).toString("hex").toUpperCase()
  return `PQR-${dateStr}-${randomSuffix}`
}

export async function submitPqrsRequest(
  data: unknown,
  reqHeaders: Headers
): Promise<SubmitPqrsResult> {
  const parsed = pqrsInputSchema.safeParse(data)
  if (!parsed.success) {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: parsed.error.issues[0]?.message ?? "Datos de solicitud inválidos",
    }
  }

  const input = parsed.data

  // Rate limiting por IP: máximo 5 radicados por hora
  const ipLimit = await consumePublicRateLimit("pqrs_ip", reqHeaders, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!ipLimit.allowed) {
    return {
      success: false,
      code: "RATE_LIMITED",
      error: "Demasiadas solicitudes radicadas desde tu conexión. Por favor intenta más tarde.",
    }
  }

  // Rate limiting por correo: máximo 3 radicados por hora
  const emailLimit = await consumePublicRateLimit("pqrs_email", reqHeaders, {
    max: 3,
    windowMs: 60 * 60 * 1000,
    subject: input.email,
  })
  if (!emailLimit.allowed) {
    return {
      success: false,
      code: "RATE_LIMITED",
      error: "Demasiadas solicitudes radicadas para este correo. Por favor intenta más tarde.",
    }
  }

  const ticketNumber = generatePqrsTicketNumber()
  const maxDays = getLegalTermBusinessDays(input.type)

  // Si es retiro de publicidad, se registra de inmediato la exclusión en la BD
  if (input.type === "RETIRO_PUBLICIDAD") {
    await processUnsubscribeEmail(input.email).catch((err) => {
      console.error("[pqrs] error auto-unsubscribing:", err)
    })
  }

  const record = await createPqrsRecord({
    ticketNumber,
    name: input.name,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    email: input.email,
    phone: input.phone || null,
    type: input.type,
    description: input.description,
  })

  // Enviar correos en segundo plano (fire-and-forget o catch)
  void (async () => {
    try {
      const company = await getLegalCompany()
      const dataProtectionEmail =
        company.dataProtectionEmail?.trim() ||
        company.contactEmail?.trim() ||
        "contacto@tiendaonestar.com"

      // 1. Confirmación al titular
      await sendPqrsConfirmationEmail({
        email: input.email,
        name: input.name,
        ticketNumber,
        type: input.type,
        maxDays,
        description: input.description,
      })

      // 2. Aviso al área responsable (dataProtectionEmail)
      await sendPqrsAdminNotificationEmail({
        toEmail: dataProtectionEmail,
        name: input.name,
        document: `${input.documentType} ${input.documentNumber}`,
        email: input.email,
        ticketNumber,
        type: input.type,
        maxDays,
        description: input.description,
      })
    } catch (error) {
      console.error("[pqrs] error sending notification emails:", error)
    }
  })()

  return {
    success: true,
    ticketNumber: record.ticketNumber,
  }
}

export async function listPqrsRequests(params?: {
  status?: PqrsStatus
  type?: PqrsType
  take?: number
  skip?: number
}) {
  return findManyPqrsRecords(params)
}

export async function getPqrsRequestById(id: string) {
  return findPqrsRecordById(id)
}

export async function updatePqrsStatus(
  id: string,
  data: {
    status: PqrsStatus
    responseNotes?: string | null
  }
) {
  return updatePqrsStatusRecord(id, data)
}
