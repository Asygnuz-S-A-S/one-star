import { NextResponse } from "next/server"
import { runAsMcpPrincipal } from "@/server/auth/mcp-context"
import { authorizeMcpRequest } from "@/server/mcp/http"
import { MCP_WRITE_LIMIT_PER_MIN } from "@/server/mcp/server"
import { consumeRequestRateLimit } from "@/server/repositories/request-rate-limit.repository"
import { createMcpAuditLog } from "@/server/repositories/mcp.repository"
import { POST as uploadAsAdmin } from "@/app/api/upload/route"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Sube un archivo local con el token del conector: `curl -F file=@foto.jpg`.
 * Reusa /api/upload (mismas validaciones, Cloudinary y MediaAsset) como el admin del token.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeMcpRequest(request)
  if ("response" in auth) return auth.response
  const { principal } = auth

  const bucket = await consumeRequestRateLimit(`mcp:write:${principal.tokenId}`, 60_000)
  if (bucket.count > MCP_WRITE_LIMIT_PER_MIN) {
    return NextResponse.json({ error: "Límite de subidas por minuto alcanzado" }, { status: 429 })
  }

  const response = await runAsMcpPrincipal(principal, () => uploadAsAdmin(request))
  const body = (await response.clone().json().catch(() => ({}))) as { url?: string; error?: string }
  await createMcpAuditLog({
    tokenId: principal.tokenId,
    adminUserId: principal.adminUserId,
    tool: "subir_archivo",
    args: body.url ? { url: body.url } : {},
    ok: response.ok,
    error: response.ok ? null : body.error ?? `HTTP ${response.status}`,
  }).catch((error) => console.error("[mcp/upload] no se pudo registrar la bitácora", error))
  return response
}
