import "server-only"

import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import {
  createAuthVerification,
  findAuthVerificationByValue,
  deleteAuthVerification,
} from "@/server/repositories/auth-verification.repository"
import { linkGuestOrdersByEmail } from "@/server/repositories/order.repository"

const GUEST_INVITE_PREFIX = "guest_invite:"

function getHmacSecret(): string {
  return (
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "onestar-guest-order-secret-change-in-production"
  )
}

/**
 * Genera un token firmado con HMAC-SHA256 y caducidad corta para que un
 * comprador invitado pueda consultar el resultado de su pedido en /checkout/success
 * sin requerir sesión ni exponer el ID del pedido directamente.
 */
export function signGuestOrderSuccessToken(
  orderId: string,
  ttlSeconds = 24 * 60 * 60
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${orderId}.${exp}`
  const signature = createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("base64url")
  return `${payload}.${signature}`
}

/**
 * Valida la firma criptográfica y la vigencia del token de éxito de compra como invitado.
 * Devuelve el orderId si es válido y vigente, o null si fue alterado o expiró.
 */
export function verifyGuestOrderSuccessToken(
  token: string | null | undefined
): { orderId: string } | null {
  if (!token || typeof token !== "string") return null

  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [orderId, expStr, signature] = parts
  if (!orderId || !expStr || !signature) return null

  const exp = parseInt(expStr, 10)
  if (isNaN(exp)) return null

  const payload = `${orderId}.${exp}`
  const expectedSignature = createHmac("sha256", getHmacSecret())
    .update(payload)
    .digest("base64url")

  const sigBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null
  }

  const nowSec = Math.floor(Date.now() / 1000)
  if (nowSec > exp) {
    return null
  }

  return { orderId }
}

/**
 * Crea un token de un solo uso para invitar al cliente invitado a crear su contraseña.
 * Se almacena en la tabla de verificaciones (AuthVerification).
 */
export async function createGuestAccountInviteToken(
  email: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000
): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const normEmail = email.trim().toLowerCase()
  const identifier = `${GUEST_INVITE_PREFIX}${normEmail}`
  const expiresAt = new Date(Date.now() + ttlMs)

  await createAuthVerification({
    id: randomUUID(),
    identifier,
    value: token,
    expiresAt,
  })

  return token
}

/**
 * Consulta y valida el token de invitación sin consumirlo (para renderizar la pantalla de creación de contraseña).
 */
export async function verifyGuestInviteToken(
  token: string | null | undefined
): Promise<{ email: string } | null> {
  if (!token || typeof token !== "string") return null

  const record = await findAuthVerificationByValue(token.trim())
  if (!record || !record.identifier.startsWith(GUEST_INVITE_PREFIX)) {
    return null
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return null
  }

  const email = record.identifier.slice(GUEST_INVITE_PREFIX.length)
  return { email }
}

/**
 * Valida, consume de forma atómica (un solo uso) el token de invitación y vincula
 * los pedidos previos del invitado al usuario recién verificado.
 */
export async function consumeGuestInviteTokenAndLinkOrders(
  token: string,
  userId: string
): Promise<{ email: string; linkedOrdersCount: number } | null> {
  const verified = await verifyGuestInviteToken(token)
  if (!verified) return null

  const record = await findAuthVerificationByValue(token.trim())
  if (!record) return null

  // Consumo de un solo uso: se elimina el token antes de vincular
  await deleteAuthVerification(record.id)

  const linkedOrdersCount = await linkGuestOrdersByEmail(verified.email, userId)

  return {
    email: verified.email,
    linkedOrdersCount,
  }
}
