"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { updateProfile as updateProfileService } from "@/server/services/user.service"
import { updateUserSchema } from "@/server/validators/user.validator"

export async function updateProfile(
  data: unknown
): Promise<{ success: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return { success: false, error: "No autenticado." }
  }

  const parsed = updateUserSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." }
  }

  await updateProfileService(session.user.id, parsed.data)
  revalidatePath("/cuenta")
  return { success: true }
}

export async function requestGuestOrdersLinkingAction(): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id || !session.user.email) {
    return {
      success: false,
      message: "",
      error: "Debes iniciar sesión para vincular tus pedidos.",
    }
  }

  const { requestGuestOrdersLinking } = await import("@/server/services/guest-order.service")
  const result = await requestGuestOrdersLinking(
    session.user.id,
    session.user.email,
    session.user.name ?? undefined
  )

  return {
    success: true,
    message: result.message,
  }
}

export async function confirmGuestOrdersLinkingAction(token: string): Promise<{
  success: boolean
  linkedCount?: number
  error?: string
}> {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Token de confirmación inválido." }
  }

  const { consumeLinkOrdersTokenAndLink } = await import("@/server/services/guest-order.service")
  const result = await consumeLinkOrdersTokenAndLink(token.trim())

  if (!result) {
    return {
      success: false,
      error: "El enlace de vinculación es inválido o ya ha expirado.",
    }
  }

  revalidatePath("/cuenta")
  revalidatePath("/api/cuenta/pedidos")

  return {
    success: true,
    linkedCount: result.linkedOrdersCount,
  }
}

