"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/server/auth/require-admin"
import {
  requestRecoverySchema,
  resetPasswordSchema,
  changeOwnPasswordSchema,
} from "@/server/validators/admin-recovery.validator"
import {
  changeAdminOwnPassword,
  requestAdminPasswordReset,
  resetAdminPasswordWithToken,
} from "@/server/services/admin-recovery.service"

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ message: string }> }).issues
    if (issues[0]?.message) return issues[0].message
  }
  return error instanceof Error ? error.message : fallback
}

export type ActionState = {
  success: boolean
  message?: string
  error?: string
}

export async function requestAdminPasswordResetAction(
  _previous: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const parsed = requestRecoverySchema.parse({
      email: String(formData.get("email") ?? ""),
    })

    const headerList = await headers()
    const result = await requestAdminPasswordReset(parsed.email, headerList)

    return {
      success: result.success,
      message: result.message,
      error: result.error,
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: extractErrorMessage(
        error,
        "No se pudo procesar la solicitud de recuperación."
      ),
    }
  }
}

export async function resetAdminPasswordWithTokenAction(
  _previous: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    if (password !== confirmPassword) {
      return { success: false, error: "Las contraseñas no coinciden." }
    }

    const parsed = resetPasswordSchema.parse({
      token: String(formData.get("token") ?? ""),
      password,
    })

    const result = await resetAdminPasswordWithToken(
      parsed.token,
      parsed.password
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "No se pudo restablecer la contraseña.",
      }
    }

    return {
      success: true,
      message:
        "Contraseña actualizada exitosamente. Ya puedes iniciar sesión.",
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: extractErrorMessage(
        error,
        "No se pudo restablecer la contraseña."
      ),
    }
  }
}

export async function changeAdminOwnPasswordAction(
  _previous: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const session = await requireAdmin()

    const currentPassword = String(formData.get("currentPassword") ?? "")
    const newPassword = String(formData.get("newPassword") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    if (newPassword !== confirmPassword) {
      return { success: false, error: "Las nuevas contraseñas no coinciden." }
    }

    const parsed = changeOwnPasswordSchema.parse({
      currentPassword,
      newPassword,
    })

    const currentSessionId = (
      session as unknown as { session?: { id?: string } }
    ).session?.id

    const result = await changeAdminOwnPassword(
      session.user.id,
      parsed.currentPassword,
      parsed.newPassword,
      currentSessionId
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? "No se pudo cambiar la contraseña.",
      }
    }

    revalidatePath("/admin/cuenta")
    return {
      success: true,
      message:
        "Contraseña actualizada exitosamente. Las demás sesiones han sido cerradas.",
    }
  } catch (error: unknown) {
    return {
      success: false,
      error: extractErrorMessage(
        error,
        "No se pudo cambiar la contraseña."
      ),
    }
  }
}
