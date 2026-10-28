import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"

export const LEAD_COOKIE_NAME = "os_lead"
export const LEAD_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 días

function getCookieSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.ASSISTANT_API_KEY ||
    "onestar-lead-cookie-dev-secret"
  )
}

function computeSignature(payload: string): string {
  return createHmac("sha256", getCookieSecret()).update(payload).digest("base64url")
}

/**
 * Genera el valor firmado de la cookie `os_lead`: `<leadId>.<issuedAtSec>.<hmac>`
 */
export function signLeadCookieValue(leadId: string, nowMs: number = Date.now()): string {
  const issuedAtSec = Math.floor(nowMs / 1000)
  const payload = `${leadId}.${issuedAtSec}`
  const sig = computeSignature(payload)
  return `${payload}.${sig}`
}

/**
 * Verifica la firma HMAC en tiempo constante y la vigencia de 30 días de `os_lead`.
 * Devuelve `leadId` si es válido o `null` en cualquier otro caso.
 */
export function verifyLeadCookieValue(
  cookieValue: string | undefined | null,
  nowMs: number = Date.now()
): string | null {
  if (!cookieValue || typeof cookieValue !== "string") return null
  const parts = cookieValue.trim().split(".")
  if (parts.length !== 3) return null

  const [leadId, issuedAtStr, providedSig] = parts
  if (!leadId || !issuedAtStr || !providedSig) return null

  const issuedAtSec = Number(issuedAtStr)
  if (!Number.isInteger(issuedAtSec) || issuedAtSec <= 0) return null

  const nowSec = Math.floor(nowMs / 1000)
  if (nowSec - issuedAtSec > LEAD_COOKIE_MAX_AGE_SECONDS) {
    return null
  }

  const payload = `${leadId}.${issuedAtSec}`
  const expectedSig = computeSignature(payload)

  const expectedBuf = Buffer.from(expectedSig, "utf8")
  const providedBuf = Buffer.from(providedSig, "utf8")
  if (expectedBuf.length !== providedBuf.length) return null
  if (!timingSafeEqual(expectedBuf, providedBuf)) return null

  return leadId
}

/**
 * Extrae una cookie por nombre desde la cabecera HTTP `Cookie`.
 */
export function extractCookieFromHeader(
  cookieHeader: string | null | undefined,
  name: string = LEAD_COOKIE_NAME
): string | null {
  if (!cookieHeader) return null
  const pairs = cookieHeader.split(";")
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=")
    if (eqIdx === -1) continue
    const k = pair.slice(0, eqIdx).trim()
    if (k === name) {
      return decodeURIComponent(pair.slice(eqIdx + 1).trim())
    }
  }
  return null
}

export function buildLeadCookieOptions(isProd: boolean = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    maxAge: LEAD_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  }
}
