import "server-only"

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"
import bcrypt from "bcryptjs"
import {
  createAuthVerification,
  deleteAuthVerification,
  deleteAuthVerificationsByIdentifier,
  findAuthVerificationByValue,
} from "@/server/repositories/auth-verification.repository"
import {
  deleteAdminSessionsByEmail,
  findAdminByEmail,
  findAdminById,
  setAdminUserPassword,
  syncAuthAccountPassword,
} from "@/server/repositories/admin.repository"
import { consumeRequestRateLimit } from "@/server/repositories/request-rate-limit.repository"
import { sendAdminPasswordResetEmail } from "@/server/services/email.service"
import { invalidateAdminRoleCache } from "@/server/services/admin-role.service"

export const ADMIN_RESET_PREFIX = "admin_password_reset:"
export const RECOVERY_SUCCESS_MESSAGE =
  "Si el correo corresponde a un administrador activo, recibirás un enlace para restablecer tu contraseña en los próximos minutos."

const TOKEN_TTL_MS = 60 * 60 * 1_000 // 1 hora
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000 // 15 minutos
const MAX_IP_ATTEMPTS = 5
const MAX_EMAIL_ATTEMPTS = 3

function getHmacSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "onestar-admin-recovery-secret"
  )
}

function getBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  return url.replace(/\/$/, "")
}

export function extractTrustedClientIp(headersList: Headers): string {
  const candidate = headersList.get("x-real-ip")?.trim() ?? ""
  return isIP(candidate) ? candidate : "unknown"
}

export function signResetToken(rawToken: string): string {
  const sig = createHmac("sha256", getHmacSecret())
    .update(rawToken)
    .digest("base64url")
  return `${rawToken}.${sig}`
}

export function verifySignedToken(fullToken: string): boolean {
  const parts = fullToken.split(".")
  if (parts.length !== 2) return false
  const [rawToken, sig] = parts
  if (!rawToken || !sig) return false

  const expectedSig = createHmac("sha256", getHmacSecret())
    .update(rawToken)
    .digest("base64url")

  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expectedSig)

  if (sigBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(sigBuffer, expectedBuffer)
}

export interface RequestResetResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Solicita el restablecimiento de contraseña para un administrador.
 * Aplica límite de tasa por IP y por correo.
 * Registra el evento de seguridad y responde SIEMPRE con el mismo mensaje neutro.
 */
export async function requestAdminPasswordReset(
  email: string,
  headersList: Headers
): Promise<RequestResetResult> {
  const normEmail = email.trim().toLowerCase()
  const ip = extractTrustedClientIp(headersList)

  // 1. Límite de intentos por IP
  const ipRate = await consumeRequestRateLimit(
    `admin_recovery_ip:${ip}`,
    RATE_LIMIT_WINDOW_MS
  )
  if (ipRate.count > MAX_IP_ATTEMPTS) {
    console.warn(
      `[admin-security] Límite de intentos por IP superado en recuperación: ip="${ip}"`
    )
    return {
      success: false,
      message: "Demasiados intentos. Intenta más tarde.",
      error: "Demasiados intentos. Intenta más tarde.",
    }
  }

  // 2. Límite de intentos por correo
  const emailRate = await consumeRequestRateLimit(
    `admin_recovery_email:${normEmail}`,
    RATE_LIMIT_WINDOW_MS
  )
  if (emailRate.count > MAX_EMAIL_ATTEMPTS) {
    console.warn(
      `[admin-security] Límite de intentos por correo superado en recuperación: email="${normEmail}", ip="${ip}"`
    )
    return {
      success: false,
      message: "Demasiados intentos. Intenta más tarde.",
      error: "Demasiados intentos. Intenta más tarde.",
    }
  }

  // 3. Buscar administrador
  const admin = await findAdminByEmail(normEmail)
  const isActive = Boolean(admin && admin.isActive)

  // 4. Registro del evento de auditoría
  console.info(
    `[admin-security] Solicitud de restablecimiento de contraseña: email="${normEmail}", ip="${ip}", adminActivo=${isActive}, fecha="${new Date().toISOString()}"`
  )

  // 5. Si es administrador activo, crear token y enviar correo
  if (admin && admin.isActive) {
    const rawToken = randomBytes(32).toString("hex")
    const signedToken = signResetToken(rawToken)
    const identifier = `${ADMIN_RESET_PREFIX}${normEmail}`
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

    // Invalidar tokens previos de recuperación para este correo
    await deleteAuthVerificationsByIdentifier(identifier)

    // Guardar nuevo token de un solo uso
    await createAuthVerification({
      id: randomUUID(),
      identifier,
      value: signedToken,
      expiresAt,
    })

    const resetUrl = `${getBaseUrl()}/admin/restablecer-contrasena?token=${encodeURIComponent(signedToken)}`

    // Enviar correo (fire-and-forget o await)
    try {
      await sendAdminPasswordResetEmail({
        email: admin.email,
        name: admin.name,
        resetUrl,
      })
    } catch (err) {
      console.error(
        `[admin-security] Error enviando correo de restablecimiento a ${admin.email}:`,
        err
      )
    }
  }

  // 6. Respuesta siempre idéntica y neutra
  return {
    success: true,
    message: RECOVERY_SUCCESS_MESSAGE,
  }
}

export interface VerifyTokenResult {
  valid: boolean
  email?: string
  error?: string
}

/**
 * Valida la firma y vigencia del token sin consumirlo.
 */
export async function verifyAdminPasswordResetToken(
  token: string | null | undefined
): Promise<VerifyTokenResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token no proporcionado." }
  }

  const trimmed = token.trim()
  if (!verifySignedToken(trimmed)) {
    return { valid: false, error: "El enlace es inválido o ha sido modificado." }
  }

  const record = await findAuthVerificationByValue(trimmed)
  if (!record || !record.identifier.startsWith(ADMIN_RESET_PREFIX)) {
    return { valid: false, error: "El enlace es inválido o ya ha sido utilizado." }
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { valid: false, error: "El enlace de recuperación ha expirado." }
  }

  const email = record.identifier.slice(ADMIN_RESET_PREFIX.length)
  return { valid: true, email }
}

export interface ResetPasswordResult {
  success: boolean
  error?: string
}

/**
 * Restablece la contraseña con un token válido, consume el token y cierra todas las sesiones.
 */
export async function resetAdminPasswordWithToken(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  const verification = await verifyAdminPasswordResetToken(token)
  if (!verification.valid || !verification.email) {
    return {
      success: false,
      error: verification.error ?? "El enlace es inválido o ha expirado.",
    }
  }

  if (newPassword.length < 10) {
    return {
      success: false,
      error: "La contraseña debe tener al menos 10 caracteres.",
    }
  }

  const admin = await findAdminByEmail(verification.email)
  if (!admin || !admin.isActive) {
    return {
      success: false,
      error: "La cuenta de administrador no existe o está desactivada.",
    }
  }

  const trimmedToken = token.trim()
  const record = await findAuthVerificationByValue(trimmedToken)
  if (!record) {
    return {
      success: false,
      error: "El enlace ya ha sido utilizado.",
    }
  }

  // 1. Consumir token (un solo uso atómico)
  await deleteAuthVerification(record.id)

  // 2. Hashear con bcrypt costo 10
  const passwordHash = bcrypt.hashSync(newPassword, 10)

  // 3. Actualizar contraseña en AdminUser
  await setAdminUserPassword(admin.id, passwordHash)

  // 4. Sincronizar en AuthAccount (better-auth)
  await syncAuthAccountPassword(admin.email, passwordHash)

  // 5. Cerrar todas las sesiones de este administrador
  const closedSessions = await deleteAdminSessionsByEmail(admin.email)

  // 6. Invalidar caché de rol
  invalidateAdminRoleCache(admin.id)
  invalidateAdminRoleCache(admin.email)

  // 7. Registro del evento
  console.info(
    `[admin-security] Contraseña restablecida con éxito para email="${admin.email}". Se cerraron ${closedSessions} sesión(es).`
  )

  return { success: true }
}

export interface ChangeOwnPasswordResult {
  success: boolean
  error?: string
}

/**
 * Cambia la contraseña propia de un administrador solicitando la contraseña actual.
 * Cierra las demás sesiones del administrador.
 */
export async function changeAdminOwnPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
  currentSessionId?: string
): Promise<ChangeOwnPasswordResult> {
  const admin = await findAdminById(adminId)
  if (!admin || !admin.isActive) {
    return { success: false, error: "Administrador no encontrado o inactivo." }
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, admin.passwordHash)
  if (!isCurrentValid) {
    return { success: false, error: "La contraseña actual es incorrecta." }
  }

  if (newPassword.length < 10) {
    return {
      success: false,
      error: "La nueva contraseña debe tener al menos 10 caracteres.",
    }
  }

  // 1. Hashear con bcrypt costo 10
  const passwordHash = bcrypt.hashSync(newPassword, 10)

  // 2. Actualizar contraseña en AdminUser
  await setAdminUserPassword(admin.id, passwordHash)

  // 3. Sincronizar en AuthAccount
  await syncAuthAccountPassword(admin.email, passwordHash)

  // 4. Cerrar las demás sesiones (conserva la actual si se provee currentSessionId)
  const closedSessions = await deleteAdminSessionsByEmail(admin.email, currentSessionId)

  // 5. Invalidar caché de rol
  invalidateAdminRoleCache(admin.id)
  invalidateAdminRoleCache(admin.email)

  console.info(
    `[admin-security] Contraseña cambiada por el propio administrador: email="${admin.email}". Se cerraron ${closedSessions} otra(s) sesión(es).`
  )

  return { success: true }
}
