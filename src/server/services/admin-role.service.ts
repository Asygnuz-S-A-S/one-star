import "server-only"
import { normalizeAdminRole, type AdminRole } from "@/lib/admin-access"
import { findAdminRoleByIdOrEmail } from "@/server/repositories/admin.repository"

interface CachedRole {
  role: AdminRole | null
  expiresAt: number
}

const roleCache = new Map<string, CachedRole>()
export const ADMIN_ROLE_CACHE_TTL_MS = 60 * 1000 // 60 segundos máximo

/**
 * Resuelve el rol actual del administrador consultando la base de datos
 * con una caché en memoria de máximo 60 segundos para evitar demoras
 * al degradar o revocar permisos.
 *
 * Si el usuario no existe, la consulta falla o el rol no es un AdminRole conocido,
 * devuelve `null` (fail-closed).
 */
export async function resolveActiveAdminRole(
  userId?: string | null,
  email?: string | null
): Promise<AdminRole | null> {
  const cacheKey = (userId?.trim() || email?.trim()) ?? ""
  if (!cacheKey) {
    return null
  }

  const now = Date.now()
  const cached = roleCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.role
  }

  try {
    const rawRole = await findAdminRoleByIdOrEmail(userId, email)
    const role = normalizeAdminRole(rawRole)
    roleCache.set(cacheKey, {
      role,
      expiresAt: now + ADMIN_ROLE_CACHE_TTL_MS,
    })
    return role
  } catch {
    // Si la consulta a la base de datos falla, niega el acceso por seguridad (fail-closed)
    return null
  }
}

/**
 * Invalida la caché del rol en memoria (útil en pruebas y cuando se altera un rol).
 */
export function invalidateAdminRoleCache(cacheKey?: string): void {
  if (cacheKey) {
    roleCache.delete(cacheKey)
  } else {
    roleCache.clear()
  }
}

/**
 * Revoca la sesión en base de datos si existe el token.
 */
export async function revokeAdminSessionByToken(token: string): Promise<void> {
  if (!token) return
  try {
    const { prisma } = await import("@/server/db/prisma")
    await prisma.authSession.deleteMany({ where: { token } })
  } catch {
    // Silencioso para no romper flujos si la base está temporalmente no disponible
  }
}
