import "server-only"

import { randomBytes, randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import {
  createAuthVerification,
  deleteAuthVerification,
  deleteAuthVerificationsByIdentifier,
  findAuthVerificationByValue,
} from "@/server/repositories/auth-verification.repository"
// Funciones genéricas por correo (sirven igual para clientes): sesiones y cuenta "credential" de better-auth.
import { deleteAdminSessionsByEmail, syncAuthAccountPassword } from "@/server/repositories/admin.repository"
import { findUserByEmail, updateUser } from "@/server/repositories/user.repository"
import { consumeRequestRateLimit } from "@/server/repositories/request-rate-limit.repository"
import { extractTrustedClientIp, signResetToken, verifySignedToken } from "@/server/services/admin-recovery.service"
import { sendCustomerPasswordResetEmail } from "@/server/services/email.service"

export const CUSTOMER_RESET_PREFIX = "customer_password_reset:"
export const CUSTOMER_RECOVERY_MESSAGE =
  "Si el correo tiene una cuenta en One Star, te enviamos un enlace para crear una nueva contraseña."

const TOKEN_TTL_MS = 60 * 60 * 1_000 // 1 hora
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000
const MAX_IP_ATTEMPTS = 10
const MAX_EMAIL_ATTEMPTS = 3
const TOO_MANY = "Demasiados intentos. Intenta de nuevo en 15 minutos."

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

/** Pide el enlace. Responde siempre lo mismo exista o no la cuenta (no revela correos). */
export async function requestCustomerPasswordReset(
  email: string,
  headersList: Headers
): Promise<{ success: boolean; message: string; error?: string }> {
  const normEmail = email.trim().toLowerCase()
  const ip = extractTrustedClientIp(headersList)

  const ipRate = await consumeRequestRateLimit(`customer_recovery_ip:${ip}`, RATE_LIMIT_WINDOW_MS)
  if (ipRate.count > MAX_IP_ATTEMPTS) return { success: false, message: TOO_MANY, error: TOO_MANY }
  const emailRate = await consumeRequestRateLimit(`customer_recovery_email:${normEmail}`, RATE_LIMIT_WINDOW_MS)
  if (emailRate.count > MAX_EMAIL_ATTEMPTS) return { success: false, message: TOO_MANY, error: TOO_MANY }

  const user = await findUserByEmail(normEmail)
  if (user) {
    // Cualquier fallo queda en el log y la respuesta sigue siendo la neutra.
    try {
      const signedToken = signResetToken(randomBytes(32).toString("hex"))
      const identifier = `${CUSTOMER_RESET_PREFIX}${normEmail}`
      await deleteAuthVerificationsByIdentifier(identifier)
      await createAuthVerification({
        id: randomUUID(),
        identifier,
        value: signedToken,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      })
      await sendCustomerPasswordResetEmail({
        email: user.email,
        name: user.name ?? undefined,
        resetUrl: `${getBaseUrl()}/restablecer-contrasena?token=${encodeURIComponent(signedToken)}`,
      })
    } catch (error) {
      console.error(`[customer-recovery] No se pudo generar o enviar el enlace para ${normEmail}:`, error)
    }
  }

  return { success: true, message: CUSTOMER_RECOVERY_MESSAGE }
}

/** Valida firma, tipo y vigencia del enlace sin consumirlo. */
export async function verifyCustomerPasswordResetToken(
  token: string | null | undefined
): Promise<{ valid: boolean; email?: string; error?: string }> {
  const trimmed = token?.trim()
  if (!trimmed) return { valid: false, error: "Falta el enlace de recuperación." }
  if (!verifySignedToken(trimmed)) return { valid: false, error: "El enlace es inválido o fue modificado." }

  const record = await findAuthVerificationByValue(trimmed)
  if (!record || !record.identifier.startsWith(CUSTOMER_RESET_PREFIX)) {
    return { valid: false, error: "El enlace es inválido o ya fue usado." }
  }
  if (record.expiresAt.getTime() <= Date.now()) return { valid: false, error: "El enlace venció. Pide uno nuevo." }

  return { valid: true, email: record.identifier.slice(CUSTOMER_RESET_PREFIX.length) }
}

/** Cambia la contraseña con un enlace válido, lo consume y cierra todas las sesiones del cliente. */
export async function resetCustomerPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const verification = await verifyCustomerPasswordResetToken(token)
  if (!verification.valid || !verification.email) {
    return { success: false, error: verification.error ?? "El enlace es inválido o venció." }
  }
  if (newPassword.length < 8) return { success: false, error: "La contraseña debe tener al menos 8 caracteres." }

  const user = await findUserByEmail(verification.email)
  const record = await findAuthVerificationByValue(token.trim())
  if (!user || !record) return { success: false, error: "El enlace es inválido o ya fue usado." }

  await deleteAuthVerification(record.id) // un solo uso
  const passwordHash = bcrypt.hashSync(newPassword, 10)
  await updateUser(user.id, { passwordHash })
  await syncAuthAccountPassword(user.email, passwordHash)
  await deleteAdminSessionsByEmail(user.email)

  return { success: true }
}
