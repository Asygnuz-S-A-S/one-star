"use server"

import { headers } from "next/headers"
import {
  customerRecoveryEmailSchema,
  customerResetPasswordSchema,
} from "@/server/validators/customer-recovery.validator"
import {
  requestCustomerPasswordReset,
  resetCustomerPasswordWithToken,
} from "@/server/services/customer-recovery.service"

export type CustomerRecoveryState = { success: boolean; message?: string; error?: string }

export async function requestCustomerPasswordResetAction(
  _previous: CustomerRecoveryState | null,
  formData: FormData
): Promise<CustomerRecoveryState> {
  const parsed = customerRecoveryEmailSchema.safeParse({ email: String(formData.get("email") ?? "") })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Correo no válido" }
  const result = await requestCustomerPasswordReset(parsed.data.email, await headers())
  return result.success ? { success: true, message: result.message } : { success: false, error: result.message }
}

export async function resetCustomerPasswordAction(
  _previous: CustomerRecoveryState | null,
  formData: FormData
): Promise<CustomerRecoveryState> {
  const password = String(formData.get("password") ?? "")
  if (password !== String(formData.get("confirmPassword") ?? "")) {
    return { success: false, error: "Las contraseñas no coinciden." }
  }
  const parsed = customerResetPasswordSchema.safeParse({ token: String(formData.get("token") ?? ""), password })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" }
  const result = await resetCustomerPasswordWithToken(parsed.data.token, parsed.data.password)
  return result.success
    ? { success: true, message: "Listo: tu contraseña cambió. Ya puedes iniciar sesión." }
    : { success: false, error: result.error }
}
