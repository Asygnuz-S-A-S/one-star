"use server"

import "server-only"
import { z } from "zod"
import {
  verifyGuestInviteToken,
  consumeGuestInviteTokenAndLinkOrders,
} from "@/server/services/guest-order.service"
import { registerUser, emailExists } from "@/server/services/user.service"
import { findGuestOrdersByEmail } from "@/server/repositories/order.repository"
import { prepareCustomerSignIn } from "@/lib/auth-actions"

const createAccountSchema = z
  .object({
    token: z.string().trim().min(1, "Token de invitación requerido"),
    name: z.string().trim().min(1, "El nombre es requerido").max(120),
    lastName: z.string().trim().min(1, "El apellido es requerido").max(120),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "Debes aceptar los términos y condiciones y el tratamiento de datos",
    }),
    newsletter: z.boolean().optional(),
    joinClub: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export async function getGuestInviteDetails(token: string): Promise<{
  valid: boolean
  email?: string
  suggestedName?: string
  suggestedLastName?: string
  ordersCount?: number
  error?: string
}> {
  try {
    const verified = await verifyGuestInviteToken(token)
    if (!verified) {
      return {
        valid: false,
        error: "El enlace de invitación no es válido o ya ha expirado.",
      }
    }

    const orders = await findGuestOrdersByEmail(verified.email)
    let suggestedName = ""
    let suggestedLastName = ""

    if (orders.length > 0 && orders[0]?.customerName) {
      const parts = orders[0].customerName.trim().split(/\s+/)
      suggestedName = parts[0] ?? ""
      suggestedLastName = parts.slice(1).join(" ")
    }

    return {
      valid: true,
      email: verified.email,
      suggestedName,
      suggestedLastName,
      ordersCount: orders.length,
    }
  } catch (error) {
    console.error("[getGuestInviteDetails] Error al verificar invitación:", error)
    return {
      valid: false,
      error: "Ocurrió un error al verificar la invitación.",
    }
  }
}

export async function completeGuestAccountCreation(
  data: unknown
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const parsed = createAccountSchema.safeParse(data)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      }
    }

    const input = parsed.data
    const verified = await verifyGuestInviteToken(input.token)
    if (!verified) {
      return {
        success: false,
        error: "El enlace de invitación no es válido o ya ha expirado.",
      }
    }

    const alreadyRegistered = await emailExists(verified.email)
    if (alreadyRegistered) {
      return {
        success: false,
        error: "Este correo ya tiene una cuenta registrada. Por favor inicia sesión.",
      }
    }

    // 1. Obtener datos de contacto del pedido del invitado
    const guestOrders = await findGuestOrdersByEmail(verified.email)
    const phone = guestOrders[0]?.customerPhone ?? ""
    const cedula = guestOrders[0]?.customerDocument ?? ""

    // 2. Registrar usuario en la base de datos
    const user = await registerUser({
      email: verified.email,
      password: input.password,
      name: input.name,
      lastName: input.lastName,
      phone,
      cedula,
      newsletter: input.newsletter,
      joinClub: input.joinClub,
    })

    // 3. Consumir el token de un solo uso y vincular pedidos anteriores del invitado
    await consumeGuestInviteTokenAndLinkOrders(input.token, user.id)

    // 3. Preparar sesión de better-auth
    await prepareCustomerSignIn(verified.email, input.password)

    return {
      success: true,
      email: verified.email,
    }
  } catch (error) {
    console.error("[completeGuestAccountCreation] Error al crear cuenta:", error)
    return {
      success: false,
      error: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    }
  }
}
