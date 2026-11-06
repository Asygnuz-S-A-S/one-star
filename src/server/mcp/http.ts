import "server-only"

import { NextResponse } from "next/server"
import type { McpPrincipal } from "@/server/auth/mcp-context"
import { consumePublicRateLimit } from "@/server/services/public-rate-limit.service"
import { authenticateMcpToken } from "@/server/services/mcp-token.service"
import { getSiteUrl } from "@/lib/site-url"

const IP_LIMIT_PER_MIN = 120

/**
 * Puerta común de /api/mcp y /api/mcp/upload: límite por IP, Origin y token.
 * Ignora las cookies del navegador a propósito: solo vale el token Bearer.
 */
export async function authorizeMcpRequest(request: Request): Promise<{ principal: McpPrincipal } | { response: NextResponse }> {
  const limit = await consumePublicRateLimit("mcp-ip", request.headers, { max: IP_LIMIT_PER_MIN, windowMs: 60_000 })
  if (!limit.allowed) {
    return {
      response: NextResponse.json(
        { error: "Demasiadas peticiones. Intenta más tarde." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } }
      ),
    }
  }

  // Un navegador en otro sitio no debe poder usar el conector (protección contra DNS rebinding).
  const origin = request.headers.get("origin")
  if (origin && origin !== getSiteUrl()) {
    return { response: NextResponse.json({ error: "Origen no permitido" }, { status: 403 }) }
  }

  const principal = await authenticateMcpToken(request.headers.get("authorization"))
  if (!principal) {
    return {
      response: NextResponse.json(
        { error: "Token inválido, vencido o revocado" },
        { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="onestar-mcp"' } }
      ),
    }
  }
  return { principal }
}
