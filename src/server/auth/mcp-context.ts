import "server-only"
import { AsyncLocalStorage } from "node:async_hooks"
import type { AdminRole } from "@/lib/admin-access"

/** Admin que llama por el conector MCP, ya autenticado con su token (ver /api/mcp). */
export interface McpPrincipal {
  tokenId: string
  adminUserId: string
  email: string
  name: string
  role: AdminRole
}

const store = new AsyncLocalStorage<McpPrincipal>()

/** Ejecuta `fn` como el admin del token: requireAdmin() lo usa en vez de la cookie. */
export function runAsMcpPrincipal<T>(principal: McpPrincipal, fn: () => Promise<T>): Promise<T> {
  return store.run(principal, fn)
}

export function getMcpPrincipal(): McpPrincipal | undefined {
  return store.getStore()
}
