import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { normalizeAdminRole, type AdminRole } from "@/lib/admin-access"
import type { McpPrincipal } from "@/server/auth/mcp-context"
import {
  countActiveMcpTokens,
  createMcpTokenRecord,
  findMcpTokenByHash,
  findMcpTokenOwner,
  listMcpTokens,
  revokeMcpTokenRecord,
  touchMcpToken,
} from "@/server/repositories/mcp.repository"

export const MCP_TOKEN_PREFIX = "osmcp_"
export const MCP_TOKEN_TTL_DAYS = 90
export const MCP_MAX_ACTIVE_TOKENS = 5
const TOUCH_INTERVAL_MS = 60 * 1000

/** Solo Super Admin puede crear y usar tokens MCP. */
export type McpTokenRole = Extract<AdminRole, "SUPER_ADMIN">

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Solo se autoriza cuando el admin activo y el token son ambos SUPER_ADMIN.
 * Cualquier otro rol (Inventario, Ventas o desconocido) es rechazado (fail-closed).
 */
export function effectiveMcpRole(adminRole: string | null | undefined, tokenRole: string): McpTokenRole | null {
  const admin = normalizeAdminRole(adminRole)
  const cap = normalizeAdminRole(tokenRole)
  if (admin !== "SUPER_ADMIN" || cap !== "SUPER_ADMIN") return null
  return "SUPER_ADMIN"
}

/** Crea un token y devuelve el valor en claro UNA sola vez; en la BD queda solo el hash. */
export async function createMcpToken(input: {
  adminUserId: string
  adminRole: AdminRole
  name: string
  role?: McpTokenRole
}): Promise<{ token: string; id: string; expiresAt: Date }> {
  const tokenRole: McpTokenRole = input.role ?? "SUPER_ADMIN"
  if (input.adminRole !== "SUPER_ADMIN" || !effectiveMcpRole(input.adminRole, tokenRole)) {
    throw new Error("Solo un Super Admin puede crear tokens para el conector MCP.")
  }
  if ((await countActiveMcpTokens(input.adminUserId)) >= MCP_MAX_ACTIVE_TOKENS) {
    throw new Error(`Máximo ${MCP_MAX_ACTIVE_TOKENS} tokens activos. Revoca uno antes de crear otro.`)
  }

  const token = MCP_TOKEN_PREFIX + randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + MCP_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  const record = await createMcpTokenRecord({
    adminUserId: input.adminUserId,
    name: input.name,
    tokenHash: hashMcpToken(token),
    prefix: token.slice(0, MCP_TOKEN_PREFIX.length + 6),
    role: tokenRole,
    expiresAt,
  })
  return { token, id: record.id, expiresAt }
}

/**
 * Valida el header `Authorization: Bearer osmcp_…`. Fail-closed: token ausente,
 * revocado, vencido, admin inactivo o sin rol válido → null.
 */
export async function authenticateMcpToken(authorization: string | null): Promise<McpPrincipal | null> {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  const token = match?.[1]
  if (!token || !token.startsWith(MCP_TOKEN_PREFIX)) return null

  try {
    const record = await findMcpTokenByHash(hashMcpToken(token))
    const now = new Date()
    if (!record || record.revokedAt || record.expiresAt <= now || !record.adminUser.isActive) return null

    const role = effectiveMcpRole(record.adminUser.role, record.role)
    if (!role) return null

    if (!record.lastUsedAt || now.getTime() - record.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      void touchMcpToken(record.id, now).catch(() => {})
    }

    return {
      tokenId: record.id,
      adminUserId: record.adminUser.id,
      email: record.adminUser.email,
      name: record.adminUser.name,
      role,
    }
  } catch {
    return null
  }
}

export async function listMcpTokensFor(actor: { id: string; role: AdminRole }) {
  return listMcpTokens(actor.role === "SUPER_ADMIN" ? undefined : actor.id)
}

/** El dueño revoca los suyos; Super Admin revoca cualquiera. */
export async function revokeMcpToken(id: string, actor: { id: string; role: AdminRole }): Promise<void> {
  const owner = await findMcpTokenOwner(id)
  if (!owner || (owner.adminUserId !== actor.id && actor.role !== "SUPER_ADMIN")) {
    throw new Error("Token no encontrado.")
  }
  if (owner.revokedAt) return
  await revokeMcpTokenRecord(id)
}
