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
  const secret = (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim()
  // Sin secreto no se firma nada: un valor por defecto en el repo permitiría falsificar tokens.
  if (!secret) throw new Error("AUTH_SECRET no está configurado.")
  return secret
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

const LINK_ORDERS_PREFIX = "link_orders:"

/**
 * Crea un token de un solo uso para verificar que el usuario autenticado
 * es el dueño del correo y confirmar la vinculación de sus compras de invitado.
 * Vigencia de 24 horas.
 */
export async function createLinkOrdersToken(
  email: string,
  userId: string,
  ttlMs = 24 * 60 * 60 * 1000
): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const normEmail = email.trim().toLowerCase()
  const identifier = `${LINK_ORDERS_PREFIX}${userId}:${normEmail}`
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
 * Valida un token de vinculación de pedidos sin consumirlo.
 */
export async function verifyLinkOrdersToken(
  token: string | null | undefined
): Promise<{ email: string; userId: string } | null> {
  if (!token || typeof token !== "string") return null

  const record = await findAuthVerificationByValue(token.trim())
  if (!record || !record.identifier.startsWith(LINK_ORDERS_PREFIX)) {
    return null
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return null
  }

  const raw = record.identifier.slice(LINK_ORDERS_PREFIX.length)
  const sepIdx = raw.indexOf(":")
  if (sepIdx === -1) return null

  const userId = raw.slice(0, sepIdx)
  const email = raw.slice(sepIdx + 1)
  if (!userId || !email) return null

  return { email, userId }
}

/**
 * Consume atómicamente el token de vinculación de pedidos y asocia
 * todas las compras previas de invitado con ese correo al userId.
 */
export async function consumeLinkOrdersTokenAndLink(
  token: string
): Promise<{ email: string; userId: string; linkedOrdersCount: number } | null> {
  const verified = await verifyLinkOrdersToken(token)
  if (!verified) return null

  const record = await findAuthVerificationByValue(token.trim())
  if (!record) return null

  await deleteAuthVerification(record.id)

  const linkedOrdersCount = await linkGuestOrdersByEmail(verified.email, verified.userId)

  return {
    email: verified.email,
    userId: verified.userId,
    linkedOrdersCount,
  }
}

/**
 * Solicita el enlace de confirmación para vincular compras anteriores realizadas como invitado.
 * El mensaje de respuesta es neutral para no filtrar información sensible.
 */
export async function requestGuestOrdersLinking(
  userId: string,
  email: string,
  name?: string
): Promise<{ sent: boolean; message: string }> {
  const token = await createLinkOrdersToken(email, userId)
  const baseUrl = (process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "")
  const verifyUrl = `${baseUrl}/cuenta?vincularToken=${encodeURIComponent(token)}`

  const { sendLinkGuestOrdersEmail } = await import("@/server/services/email.service")
  await sendLinkGuestOrdersEmail({
    email: email.trim().toLowerCase(),
    name,
    verifyUrl,
  }).catch((err) => {
    console.error("[requestGuestOrdersLinking] Error al enviar correo de vinculación:", err)
  })

  return {
    sent: true,
    message: "Si existen pedidos de invitado registrados con tu correo, hemos enviado un enlace de confirmación a tu bandeja de entrada.",
  }
}

