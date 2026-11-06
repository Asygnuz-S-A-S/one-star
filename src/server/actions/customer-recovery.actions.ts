"use server"

import { headers } from "next/headers"
import { ZodError } from "zod"
import {
  requestCustomerPasswordReset,
  resetCustomerPasswordWithToken,
} from "@/server/services/customer-recovery.service"
import { customerRecoveryRequestSchema, customerResetSchema } from "@/server/validators/customer-recovery.validator"

export type CustomerRecoveryState = { success: boolean; message?: string; error?: string }

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ZodError ? (error.issues[0]?.message ?? fallback) : fallback
}

export async function requestCustomerPasswordResetAction(
  _previous: CustomerRecoveryState | null,
  formData: FormData
): Promise<CustomerRecoveryState> {
  try {
    const { email } = customerRecoveryRequestSchema.parse({ email: String(formData.get("email") ?? "") })
    const result = await requestCustomerPasswordReset(email, await headers())
    return { success: result.success, message: result.message, error: result.error }
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error, "No se pudo procesar la solicitud.") }
  }
}

export async function resetCustomerPasswordAction(
  _previous: CustomerRecoveryState | null,
  formData: FormData
): Promise<CustomerRecoveryState> {
  try {
    const password = String(formData.get("password") ?? "")
    if (password !== String(formData.get("confirmPassword") ?? "")) {
      return { success: false, error: "Las contraseñas no coinciden." }
    }
    const parsed = customerResetSchema.parse({ token: String(formData.get("token") ?? ""), password })
    const result = await resetCustomerPasswordWithToken(parsed.token, parsed.password)
    return result.success
      ? { success: true, message: "Listo. Ya puedes iniciar sesión con tu nueva contraseña." }
      : { success: false, error: result.error }
  } catch (error: unknown) {
    return { success: false, error: errorMessage(error, "No se pudo cambiar la contraseña.") }
  }
}
