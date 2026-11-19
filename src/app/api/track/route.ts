import { cookies } from "next/headers"
import {
  SESSION_COOKIE,
  VISITOR_COOKIE,
  trackWebHit,
} from "@/server/services/web-analytics.service"
import { trackHitSchema } from "@/server/validators/web-analytics.validator"

/**
 * Analítica propia (first-party). El navegador manda aquí cada vista con
 * `navigator.sendBeacon`. Al ser nuestro propio dominio, los bloqueadores de
 * anuncios no lo tumban como hacen con el píxel de Meta.
 *
 * Responde 204 siempre que el cuerpo sea válido: medir nunca debe romper la
 * navegación de un cliente.
 */
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Límite por visitante: 60 hits por minuto, en memoria del proceso. */
const RATE_LIMIT_MAX = 60
const RATE_LIMIT_WINDOW_MS = 60_000
const hits = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const current = hits.get(key)

  if (!current || now > current.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    // Limpieza barata: evita que el mapa crezca sin control con tráfico alto.
    if (hits.size > 10_000) {
      for (const [mapKey, value] of hits) {
        if (now > value.resetAt) hits.delete(mapKey)
      }
    }
    return false
  }

  current.count += 1
  return current.count > RATE_LIMIT_MAX
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  const parsed = trackHitSchema.safeParse(payload)
  if (!parsed.success) {
    return new Response(null, { status: 400 })
  }

  const cookieStore = await cookies()
  const visitorCookie = cookieStore.get(VISITOR_COOKIE)?.value ?? null
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value ?? null

  if (isRateLimited(visitorCookie ?? "anon")) {
    return new Response(null, { status: 429 })
  }

  try {
    const result = await trackWebHit({
      path: parsed.data.path,
      query: parsed.data.query,
      referrer: parsed.data.referrer ?? null,
      userAgent: request.headers.get("user-agent"),
      visitorCookie,
      sessionCookie,
    })

    const secure = process.env.NODE_ENV === "production"
    for (const cookie of result.cookiesToSet) {
      cookieStore.set(cookie.name, cookie.value, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        ...(cookie.maxAge === undefined ? {} : { maxAge: cookie.maxAge }),
      })
    }
  } catch (error) {
    // Nunca propagamos: un fallo midiendo no puede afectar al cliente.
    console.error("[api/track] no se pudo registrar el evento:", error)
    return new Response(null, { status: 204 })
  }

  return new Response(null, { status: 204 })
}
