import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }))
vi.mock("@/server/services/admin-role.service", () => ({ resolveActiveAdminRole: vi.fn() }))

const consumeRequestRateLimit = vi.hoisted(() => vi.fn())
vi.mock("@/server/repositories/request-rate-limit.repository", () => ({ consumeRequestRateLimit }))
const createMcpAuditLog = vi.hoisted(() => vi.fn())
vi.mock("@/server/repositories/mcp.repository", () => ({ createMcpAuditLog }))

const runs = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }))
vi.mock("../tools", async () => {
  const { requireAdmin } = await import("@/server/auth/require-admin")
  return {
    MCP_TOOLS: [
      { name: "leer", description: "", area: "inventory", readOnly: true, live: false, input: z.object({}), run: runs.read },
      {
        name: "escribir_contenido",
        description: "",
        area: "superadmin",
        readOnly: false,
        live: true,
        input: z.object({ titulo: z.string().min(2) }),
        run: async (args: unknown) => {
          const session = await requireAdmin("superadmin")
          return runs.write(args, session.user.id)
        },
      },
    ],
  }
})

import { handleMcpMessage } from "../server"
import type { McpPrincipal } from "@/server/auth/mcp-context"

const superAdmin: McpPrincipal = { tokenId: "tok_1", adminUserId: "adm_1", email: "a@b.co", name: "A", role: "SUPER_ADMIN" }
const inventory: McpPrincipal = { ...superAdmin, tokenId: "tok_2", role: "INVENTORY_OPERATOR" }

const call = (principal: McpPrincipal, name: string, args: unknown = {}) =>
  handleMcpMessage(principal, { jsonrpc: "2.0", id: 7, method: "tools/call", params: { name, arguments: args } })

describe("servidor MCP", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumeRequestRateLimit.mockResolvedValue({ count: 1, resetAt: new Date() })
    createMcpAuditLog.mockResolvedValue({})
    runs.write.mockResolvedValue({ success: true })
  })

  it("initialize negocia la versión y anuncia herramientas", async () => {
    const res = await handleMcpMessage(superAdmin, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } })
    expect(res).toMatchObject({ result: { protocolVersion: "2025-03-26", capabilities: { tools: {} } } })
  })

  it("las notificaciones no tienen respuesta", async () => {
    expect(await handleMcpMessage(superAdmin, { jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull()
  })

  it("tools/list muestra solo lo que el rol puede usar, con anotaciones", async () => {
    const res = (await handleMcpMessage(inventory, { jsonrpc: "2.0", id: 2, method: "tools/list" })) as { result: { tools: { name: string }[] } }
    expect(res.result.tools.map((t) => t.name)).toEqual(["leer"])
    const all = (await handleMcpMessage(superAdmin, { jsonrpc: "2.0", id: 3, method: "tools/list" })) as {
      result: { tools: { name: string; annotations: unknown; inputSchema: { properties: object } }[] }
    }
    expect(all.result.tools[1]).toMatchObject({
      name: "escribir_contenido",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: { properties: { titulo: { type: "string" } } },
    })
  })

  it("una herramienta fuera del rol no existe para ese token", async () => {
    expect(await call(inventory, "escribir_contenido", { titulo: "Hola" })).toMatchObject({ error: { code: -32602 } })
    expect(runs.write).not.toHaveBeenCalled()
  })

  it("corre como el admin del token y deja bitácora", async () => {
    const res = await call(superAdmin, "escribir_contenido", { titulo: "Hola" })
    expect(runs.write).toHaveBeenCalledWith({ titulo: "Hola" }, "adm_1")
    expect(res).toMatchObject({ result: { content: [{ type: "text" }] } })
    expect(createMcpAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ tokenId: "tok_1", adminUserId: "adm_1", tool: "escribir_contenido", args: { titulo: "Hola" }, ok: true })
    )
  })

  it("valida con zod antes de correr y registra el fallo", async () => {
    const res = await call(superAdmin, "escribir_contenido", { titulo: "x" })
    expect(res).toMatchObject({ result: { isError: true } })
    expect(runs.write).not.toHaveBeenCalled()
    expect(createMcpAuditLog).toHaveBeenCalledWith(expect.objectContaining({ ok: false }))
  })

  it("respeta el límite de escrituras por token", async () => {
    consumeRequestRateLimit.mockResolvedValue({ count: 21, resetAt: new Date() })
    const res = await call(superAdmin, "escribir_contenido", { titulo: "Hola" })
    expect(consumeRequestRateLimit).toHaveBeenCalledWith("mcp:write:tok_1", 60_000)
    expect(res).toMatchObject({ result: { isError: true } })
    expect(runs.write).not.toHaveBeenCalled()
  })

  it("rechaza mensajes que no son JSON-RPC y métodos desconocidos", async () => {
    expect(await handleMcpMessage(superAdmin, [{ jsonrpc: "2.0", id: 1, method: "ping" }])).toMatchObject({ error: { code: -32600 } })
    expect(await handleMcpMessage(superAdmin, { jsonrpc: "2.0", id: 1, method: "resources/list" })).toMatchObject({ error: { code: -32601 } })
  })
})
