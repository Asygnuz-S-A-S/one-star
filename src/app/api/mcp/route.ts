import { NextResponse } from "next/server"
import { authorizeMcpRequest } from "@/server/mcp/http"
import { handleMcpMessage } from "@/server/mcp/server"

export const dynamic = "force-dynamic"

const MAX_BODY_BYTES = 1024 * 1024

/** Conector MCP del admin (Streamable HTTP sin estado). Guía: docs/mcp-admin.md */
export async function POST(request: Request) {
  const auth = await authorizeMcpRequest(request)
  if ("response" in auth) return auth.response

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Mensaje demasiado grande" }, { status: 413 })
  }

  let message: unknown
  try {
    message = JSON.parse(raw)
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400 })
  }

  const response = await handleMcpMessage(auth.principal, message)
  if (!response) return new NextResponse(null, { status: 202 })
  return NextResponse.json(response)
}

/** Sin flujo SSE ni sesiones: el cliente trabaja solo con POST. */
export function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405, headers: { Allow: "POST" } })
}

export const DELETE = GET
