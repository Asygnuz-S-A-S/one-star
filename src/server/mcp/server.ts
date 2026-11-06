import "server-only"

import { z, ZodError } from "zod"
import type { Prisma } from "@prisma/client"
import { roleCanAccessArea } from "@/lib/admin-access"
import { runAsMcpPrincipal, type McpPrincipal } from "@/server/auth/mcp-context"
import { UnauthorizedError } from "@/server/auth/require-admin"
import { consumeRequestRateLimit } from "@/server/repositories/request-rate-limit.repository"
import { createMcpAuditLog } from "@/server/repositories/mcp.repository"
import { MCP_TOOLS, type McpTool } from "./tools"

/**
 * Servidor MCP mínimo (Streamable HTTP sin estado, respuestas JSON).
 * Solo implementa lo que usa un cliente de herramientas: initialize, ping,
 * tools/list y tools/call. Sin sesiones ni SSE.
 */
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"]
export const MCP_READ_LIMIT_PER_MIN = 60
export const MCP_WRITE_LIMIT_PER_MIN = 20
const MAX_AUDIT_ARGS_CHARS = 4000

const INSTRUCTIONS = `Admin de la tienda One Star (tiendaonestar.com). Responde en español.
- El constructor de páginas funciona con borrador: guardar_borrador_seccion no cambia la tienda; publicar_pagina sí. Antes de publicar, resume los cambios y pide confirmación.
- Herramientas marcadas como destructivas cambian lo que ven los clientes al instante: confirma antes.
- Para editar una sección, primero ver_pagina y envía la configuración completa modificada.
- Este conector no tiene acceso a pedidos, clientes, leads ni PQRS.`

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string } }

function rpcError(id: JsonRpcRequest["id"], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }
}

export function toolsFor(principal: McpPrincipal): McpTool[] {
  return MCP_TOOLS.filter((t) => roleCanAccessArea(principal.role, t.area))
}

function describeTool(t: McpTool) {
  return {
    name: t.name,
    description: t.description,
    inputSchema: z.toJSONSchema(t.input, { io: "input" }),
    annotations: { readOnlyHint: t.readOnly, destructiveHint: t.live, openWorldHint: false },
  }
}

function auditArgs(args: unknown): Prisma.InputJsonValue {
  const json = JSON.stringify(args ?? {})
  return json.length <= MAX_AUDIT_ARGS_CHARS ? (JSON.parse(json) as Prisma.InputJsonValue) : { truncated: json.slice(0, MAX_AUDIT_ARGS_CHARS) }
}

function errorText(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0]
    return `Datos inválidos${issue?.path.length ? ` en ${issue.path.join(".")}` : ""}: ${issue?.message ?? "revisa los campos"}`
  }
  if (error instanceof UnauthorizedError) return error.message
  if (error instanceof Error) return error.message
  return "Error inesperado"
}

async function callTool(principal: McpPrincipal, params: Record<string, unknown> | undefined) {
  const name = typeof params?.name === "string" ? params.name : ""
  const t = toolsFor(principal).find((candidate) => candidate.name === name)
  if (!t) return { notFound: true as const }

  const limit = t.readOnly ? MCP_READ_LIMIT_PER_MIN : MCP_WRITE_LIMIT_PER_MIN
  const bucket = await consumeRequestRateLimit(`mcp:${t.readOnly ? "read" : "write"}:${principal.tokenId}`, 60_000)
  if (bucket.count > limit) {
    return { result: { isError: true, content: [{ type: "text", text: `Límite de ${limit} llamadas por minuto alcanzado. Espera un momento.` }] } }
  }

  const args = params?.arguments ?? {}
  let output: unknown
  let failure: string | null = null
  try {
    const parsed = t.input.parse(args)
    output = await runAsMcpPrincipal(principal, () => t.run(parsed as never))
  } catch (error) {
    failure = errorText(error)
  }

  // Bitácora de toda llamada (quién, qué, cuándo, resultado). Si falla, no se oculta el resultado.
  await createMcpAuditLog({
    tokenId: principal.tokenId,
    adminUserId: principal.adminUserId,
    tool: t.name,
    args: auditArgs(args),
    ok: failure === null,
    error: failure,
  }).catch((error) => console.error("[mcp] no se pudo registrar la bitácora", error))

  return {
    result: failure
      ? { isError: true, content: [{ type: "text", text: failure }] }
      : { content: [{ type: "text", text: JSON.stringify(output ?? { success: true }, null, 2) }] },
  }
}

/** Atiende un mensaje JSON-RPC ya autenticado. Devuelve null para notificaciones. */
export async function handleMcpMessage(principal: McpPrincipal, message: unknown): Promise<JsonRpcResponse | null> {
  const msg = message as Partial<JsonRpcRequest> | null
  if (!msg || typeof msg !== "object" || Array.isArray(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(null, -32600, "Solicitud JSON-RPC inválida")
  }
  const isNotification = msg.id === undefined
  if (isNotification) return null

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion
      return {
        jsonrpc: "2.0",
        id: msg.id ?? null,
        result: {
          protocolVersion: typeof requested === "string" && SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "onestar-admin", version: "1.0.0" },
          instructions: INSTRUCTIONS,
        },
      }
    }
    case "ping":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: {} }
    case "tools/list":
      return { jsonrpc: "2.0", id: msg.id ?? null, result: { tools: toolsFor(principal).map(describeTool) } }
    case "tools/call": {
      const outcome = await callTool(principal, msg.params)
      if ("notFound" in outcome) return rpcError(msg.id, -32602, "Herramienta desconocida o sin permiso")
      return { jsonrpc: "2.0", id: msg.id ?? null, result: outcome.result }
    }
    default:
      return rpcError(msg.id, -32601, `Método no soportado: ${msg.method}`)
  }
}
