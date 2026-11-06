import "server-only"

import { randomBytes, randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import {
  createAuthVerification,
  deleteAuthVerification,
  deleteAuthVerificationsByIdentifier,
  findAuthVerificationByValue,
} from "@/server/repositories/auth-verification.repository"
import {
  deleteSessionsByUserEmail,
  findCustomerByEmailInsensitive,
  setUserPasswordHash,
} from "@/server/repositories/user.repository"
import { consumeRequestRateLimit } from "@/server/repositories/request-rate-limit.repository"
import { sendCustomerPasswordResetEmail } from "@/server/services/email.service"
import { getSiteUrl } from "@/lib/site-url"
// Misma firma HMAC y misma IP de confianza que la recuperación de administradores.
import { extractTrustedClientIp, signResetToken, verifySignedToken } from "@/server/services/admin-recovery.service"

export const CUSTOMER_RESET_PREFIX = "customer_password_reset:"
export const CUSTOMER_RECOVERY_MESSAGE =
  "Si el correo tiene una cuenta en One Star, te llegará un enlace para crear una nueva contraseña en los próximos minutos."

const TOKEN_TTL_MS = 60 * 60 * 1_000
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000
const MAX_IP_ATTEMPTS = 5
const MAX_EMAIL_ATTEMPTS = 3
const TOO_MANY = "Demasiados intentos. Intenta de nuevo en 15 minutos."

/** Responde siempre lo mismo, exista o no la cuenta, para no revelar qué correos están registrados. */
export async function requestCustomerPasswordReset(
  email: string,
  headersList: Headers
): Promise<{ success: boolean; message: string }> {
  const normEmail = email.trim().toLowerCase()
  const ip = extractTrustedClientIp(headersList)

  const ipRate = await consumeRequestRateLimit(`customer_recovery_ip:${ip}`, RATE_LIMIT_WINDOW_MS)
  if (ipRate.count > MAX_IP_ATTEMPTS) return { success: false, message: TOO_MANY }
  const emailRate = await consumeRequestRateLimit(`customer_recovery_email:${normEmail}`, RATE_LIMIT_WINDOW_MS)
  if (emailRate.count > MAX_EMAIL_ATTEMPTS) return { success: false, message: TOO_MANY }

  const user = await findCustomerByEmailInsensitive(normEmail)
  if (user) {
    // Un fallo aquí no debe cambiar la respuesta: delataría que el correo existe.
    try {
      const identifier = `${CUSTOMER_RESET_PREFIX}${user.email.toLowerCase()}`
      const signedToken = signResetToken(randomBytes(32).toString("hex"))
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
        resetUrl: `${getSiteUrl()}/restablecer-contrasena?token=${encodeURIComponent(signedToken)}`,
      })
    } catch (err) {
      console.error("[customer-recovery] No se pudo generar o enviar el enlace:", err)
    }
  }

  return { success: true, message: CUSTOMER_RECOVERY_MESSAGE }
}

/** Valida firma, tipo y vigencia del enlace sin consumirlo. */
export async function verifyCustomerPasswordResetToken(
  token: string | null | undefined
): Promise<{ valid: boolean; email?: string; error?: string }> {
  const trimmed = typeof token === "string" ? token.trim() : ""
  if (!trimmed || !verifySignedToken(trimmed)) {
    return { valid: false, error: "El enlace no es válido o fue modificado." }
  }
  const record = await findAuthVerificationByValue(trimmed)
  if (!record || !record.identifier.startsWith(CUSTOMER_RESET_PREFIX)) {
    return { valid: false, error: "El enlace no es válido o ya se usó." }
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { valid: false, error: "El enlace venció. Pide uno nuevo." }
  }
  return { valid: true, email: record.identifier.slice(CUSTOMER_RESET_PREFIX.length) }
}

/** Cambia la contraseña con un enlace válido, lo consume y cierra las sesiones abiertas. */
export async function resetCustomerPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const verification = await verifyCustomerPasswordResetToken(token)
  if (!verification.valid || !verification.email) {
    return { success: false, error: verification.error ?? "El enlace no es válido." }
  }
  if (newPassword.length < 8) {
    return { success: false, error: "La contraseña debe tener al menos 8 caracteres." }
  }
  const user = await findCustomerByEmailInsensitive(verification.email)
  if (!user) return { success: false, error: "La cuenta ya no existe." }

  const record = await findAuthVerificationByValue(token.trim())
  if (!record) return { success: false, error: "El enlace ya se usó." }
  await deleteAuthVerification(record.id)

  await setUserPasswordHash(user.id, bcrypt.hashSync(newPassword, 10))
  await deleteSessionsByUserEmail(user.email)
  return { success: true }
}
