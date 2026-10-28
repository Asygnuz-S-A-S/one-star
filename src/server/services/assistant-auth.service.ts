import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"
import { isIP } from "node:net"
import { NextResponse } from "next/server"
import { consumePublicRateLimit } from "./public-rate-limit.service"
import {
  consumeRequestRateLimit,
  findActiveRateLimitExceeded,
} from "../repositories/request-rate-limit.repository"
import { normalizeDigits, normalizePhone10 } from "../validators/assistant.validator"

export interface AuthSuccess {
  authorized: true
  apiKey: string
}

export interface AuthFailure {
  authorized: false
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

function timingSafeMatch(a: string, b: string): boolean {
  // Hash both to sha256 to guarantee identical 32-byte buffers,
  // preventing length leakage and avoiding length mismatch errors in timingSafeEqual.
  const hashA = createHash("sha256").update(a).digest()
  const hashB = createHash("sha256").update(b).digest()
  return timingSafeEqual(hashA, hashB)
}

function clientIp(headers: Headers): string {
  const candidate = headers.get("x-real-ip")?.trim() ?? ""
  return isIP(candidate) ? candidate : "unknown"
}

function rateLimitKey(bucket: string, subject: string): string {
  return createHash("sha256")
    .update(bucket)
    .update("\0")
    .update(subject.trim().toLowerCase())
    .digest("base64url")
}

const ORDER_FAILED_MAX = 5
const ORDER_FAILED_WINDOW_MS = 60 * 60 * 1000 // 1 hora

/**
 * Rutas del asistente de WhatsApp donde se permite únicamente POST.
 * Todas las demás rutas de `/api/assistant/*` solo permiten GET.
 */
export const POST_ALLOWED_ASSISTANT_PATHS = new Set([
  "/api/assistant/leads",
  "/api/assistant/leads/event",
  "/api/assistant/leads/link",
])

function resolveNormalizedPathname(url: string): string {
  try {
    return new URL(url, "https://onestar.com.co").pathname.replace(/\/+$/, "") || "/"
  } catch {
    return "/"
  }
}

/**
 * Valida método HTTP (POST solo en rutas autorizadas de leads; GET en el resto),
 * presencia y exactitud de ASSISTANT_API_KEY en tiempo constante
 * y el rate limit general de la API de asistente.
 */
export async function authenticateAssistantRequest(req: Request): Promise<AuthResult> {
  const pathname = resolveNormalizedPathname(req.url)
  const expectedMethod = POST_ALLOWED_ASSISTANT_PATHS.has(pathname) ? "POST" : "GET"

  if (req.method !== expectedMethod) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Método no permitido" },
        { status: 405, headers: { Allow: expectedMethod } }
      ),
    }
  }

  const serverApiKey = process.env.ASSISTANT_API_KEY
  if (!serverApiKey) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Servicio de asistente deshabilitado" },
        { status: 503 }
      ),
    }
  }

  const providedKey = req.headers.get("x-assistant-key")?.trim()
  if (!providedKey || !timingSafeMatch(providedKey, serverApiKey)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ),
    }
  }

  // Rate limit por clave e IP
  const maxPerMin = Number(process.env.ASSISTANT_RATE_LIMIT_PER_MIN) || 60
  const rateLimit = await consumePublicRateLimit("assistant-api", req.headers, {
    max: maxPerMin,
    windowMs: 60 * 1000,
    subject: createHash("sha256").update(providedKey).digest("hex").slice(0, 16),
  })

  if (!rateLimit.allowed) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Límite de peticiones excedido. Intenta más tarde." },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined,
        }
      ),
    }
  }

  return { authorized: true, apiKey: providedKey }
}

/**
 * Límite de peticiones por waPhone para las rutas de escritura de leads del asistente.
 */
export async function checkLeadPhoneRateLimit(
  headers: Headers,
  waPhone: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const normPhone = normalizeDigits(waPhone)
  const maxPerPhonePerMin = Number(process.env.ASSISTANT_PHONE_RATE_LIMIT_PER_MIN) || 30
  return consumePublicRateLimit("assistant-lead-phone", headers, {
    max: maxPerPhonePerMin,
    windowMs: 60 * 1000,
    subject: normPhone || "unknown-phone",
  })
}

/**
 * Verifica si la cédula, el waPhone o la IP han alcanzado el límite de 5 intentos fallidos
 * en la última hora.
 */
export async function checkOrderRateLimits(
  headers: Headers,
  cedula: string,
  waPhone: string
): Promise<{ blocked: boolean; retryAfterSeconds?: number }> {
  const ip = clientIp(headers)
  const normCedula = normalizeDigits(cedula)
  const normPhone = normalizePhone10(waPhone)

  const keys = [
    rateLimitKey("assistant-order-fail-ip", ip),
    normCedula ? rateLimitKey("assistant-order-fail-cedula", normCedula) : null,
    normPhone ? rateLimitKey("assistant-order-fail-phone", normPhone) : null,
  ].filter(Boolean) as string[]

  const records = await findActiveRateLimitExceeded(keys, ORDER_FAILED_MAX)

  if (records.length > 0) {
    const maxReset = Math.max(...records.map((r) => r.resetAt.getTime()))
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil((maxReset - Date.now()) / 1000)),
    }
  }

  return { blocked: false }
}

/**
 * Registra un intento fallido en el endpoint de pedidos (por IP, cédula y waPhone).
 */
export async function recordOrderFailedAttempt(
  headers: Headers,
  cedula: string,
  waPhone: string
): Promise<void> {
  const ip = clientIp(headers)
  const normCedula = normalizeDigits(cedula)
  const normPhone = normalizePhone10(waPhone)

  const keys = [
    rateLimitKey("assistant-order-fail-ip", ip),
    normCedula ? rateLimitKey("assistant-order-fail-cedula", normCedula) : null,
    normPhone ? rateLimitKey("assistant-order-fail-phone", normPhone) : null,
  ].filter(Boolean) as string[]

  await Promise.all(
    keys.map((key) => consumeRequestRateLimit(key, ORDER_FAILED_WINDOW_MS))
  )
}
