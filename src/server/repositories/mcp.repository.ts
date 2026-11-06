import "server-only"
import type { AdminRole, Prisma } from "@prisma/client"
import { prisma } from "../db/prisma"

export async function findMcpTokenByHash(tokenHash: string) {
  return prisma.mcpToken.findUnique({
    where: { tokenHash },
    include: { adminUser: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  })
}

export async function countActiveMcpTokens(adminUserId: string, now = new Date()): Promise<number> {
  return prisma.mcpToken.count({ where: { adminUserId, revokedAt: null, expiresAt: { gt: now } } })
}

export async function createMcpTokenRecord(data: {
  adminUserId: string
  name: string
  tokenHash: string
  prefix: string
  role: AdminRole
  expiresAt: Date
}) {
  return prisma.mcpToken.create({ data })
}

const listSelect = {
  id: true,
  name: true,
  prefix: true,
  role: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  adminUser: { select: { email: true } },
} satisfies Prisma.McpTokenSelect

/** Sin `adminUserId` lista los de todos los admins (vista de Super Admin). */
export async function listMcpTokens(adminUserId?: string) {
  return prisma.mcpToken.findMany({
    where: adminUserId ? { adminUserId } : undefined,
    orderBy: { createdAt: "desc" },
    select: listSelect,
    take: 100,
  })
}

export async function findMcpTokenOwner(id: string) {
  return prisma.mcpToken.findUnique({ where: { id }, select: { adminUserId: true, revokedAt: true } })
}

export async function revokeMcpTokenRecord(id: string, now = new Date()) {
  return prisma.mcpToken.update({ where: { id }, data: { revokedAt: now } })
}

export async function touchMcpToken(id: string, now = new Date()) {
  return prisma.mcpToken.update({ where: { id }, data: { lastUsedAt: now } })
}

export async function createMcpAuditLog(data: {
  tokenId: string
  adminUserId: string
  tool: string
  args?: Prisma.InputJsonValue
  ok: boolean
  error?: string | null
}) {
  return prisma.mcpAuditLog.create({ data })
}

export async function listMcpAuditLogs(take = 100) {
  return prisma.mcpAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { token: { select: { name: true, prefix: true, adminUser: { select: { email: true } } } } },
  })
}
