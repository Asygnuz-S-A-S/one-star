"use server"

import {
  processUnsubscribeEmail,
  verifyUnsubscribeToken,
} from "@/server/services/unsubscribe.service"
import { z } from "zod"

const unsubscribeSchema = z.object({
  token: z.string().optional(),
  email: z.string().email("Ingresa un correo electrónico válido").optional(),
})

export async function processUnsubscribeAction(input: unknown): Promise<{
  success: boolean
  email?: string
  error?: string
}> {
  const parsed = unsubscribeSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Datos de solicitud inválidos." }
  }

  let emailToUnsubscribe = parsed.data.email

  if (parsed.data.token) {
    const verified = verifyUnsubscribeToken(parsed.data.token)
    if (verified) {
      emailToUnsubscribe = verified
    } else if (!emailToUnsubscribe) {
      return { success: false, error: "El enlace de baja es inválido o ha expirado." }
    }
  }

  if (!emailToUnsubscribe) {
    return { success: false, error: "Por favor proporciona un correo electrónico válido." }
  }

  await processUnsubscribeEmail(emailToUnsubscribe)

  return {
    success: true,
    email: emailToUnsubscribe,
  }
}
