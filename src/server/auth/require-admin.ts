import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { roleCanAccessArea, type AdminArea, type AdminRole } from "@/lib/admin-access"
import { resolveActiveAdminRole } from "@/server/services/admin-role.service"
import { getMcpPrincipal, type McpPrincipal } from "./mcp-context"

/**
 * Error de autorización. Se lanza cuando quien invoca una Server Action o ruta
 * protegida no es un administrador o no posee el privilegio requerido.
 * Los callers pueden distinguirlo del resto de errores mediante `instanceof UnauthorizedError`.
 */
export class UnauthorizedError extends Error {
  constructor(message = "No autorizado.") {
    super(message)
    this.name = "UnauthorizedError"
  }
}

/**
 * Defensa en profundidad para las Server Actions y rutas de administración.
 *
 * Las Server Actions son endpoints HTTP públicos: cualquiera puede invocarlas
 * conociendo su ID, por lo que NO basta con el middleware (`proxy.ts`) que solo
 * filtra por ruta. Toda mutación de admin DEBE verificar la sesión aquí.
 *
 * Lanza {@link UnauthorizedError} si no hay sesión de administrador, si su rol
 * activo no es válido o si su rol no tiene el `area` pedida (fail-closed).
 * Sin argumento exige Super Admin: las áreas "inventory" y "sales" se piden a propósito.
 */
export async function requireAdmin(area: AdminArea = "superadmin") {
  const mcp = getMcpPrincipal()
  if (mcp) {
    // Regla de empresa: los agentes de IA no tocan datos de clientes (área de ventas).
    if (area === "sales" || !roleCanAccessArea(mcp.role, area)) {
      throw new UnauthorizedError(
        area === "superadmin" ? "Esta acción requiere el rol Super Admin." : "Tu rol no tiene permiso para esta acción."
      )
    }
    return mcpSession(mcp)
  }

  const session = await auth.api.getSession({ headers: await headers() })
  const userType = (session?.user as { userType?: string } | undefined)?.userType
  if (!session || userType !== "admin") {
    throw new UnauthorizedError()
  }

  const role = await resolveActiveAdminRole(
    session.user.id,
    (session.user as { email?: string } | undefined)?.email
  )
  if (!role) {
    throw new UnauthorizedError()
  }
  if (!roleCanAccessArea(role, area)) {
    throw new UnauthorizedError(
      area === "superadmin" ? "Esta acción requiere el rol Super Admin." : "Tu rol no tiene permiso para esta acción."
    )
  }

  return {
    ...session,
    user: {
      ...session.user,
      adminRole: role,
    },
  }
}

/**
 * Igual que {@link requireAdmin} pero devuelve la sesión o `null` en vez de
 * lanzar. Útil en callers que ya usan el patrón `{ success, error }`.
 */
export async function getAdminSession() {
  const mcp = getMcpPrincipal()
  if (mcp) return mcpSession(mcp)

  const session = await auth.api.getSession({ headers: await headers() })
  const userType = (session?.user as { userType?: string } | undefined)?.userType
  if (!session || userType !== "admin") return null

  const role = await resolveActiveAdminRole(
    session.user.id,
    (session.user as { email?: string } | undefined)?.email
  )
  if (!role) return null

  return {
    ...session,
    user: {
      ...session.user,
      adminRole: role,
    },
  }
}

/** Forma de sesión mínima para un admin del conector MCP (sin cookie de navegador). */
function mcpSession(mcp: McpPrincipal) {
  return {
    session: null,
    user: { id: mcp.adminUserId, email: mcp.email, name: mcp.name, userType: "admin", adminRole: mcp.role },
  }
}

export type { AdminRole } from "@/lib/admin-access"

/**
 * Rol activo del admin autenticado según la base de datos (con caché corta de máx 60s),
 * o `null` si no hay sesión de admin o el rol es inválido.
 * Las sesiones sin rol previo resuelven su rol actual en base de datos;
 * si la consulta falla o el usuario no existe, devuelve `null` (fail-closed).
 */
export async function getAdminRole(): Promise<AdminRole | null> {
  const mcp = getMcpPrincipal()
  if (mcp) return mcp.role

  const session = await auth.api.getSession({ headers: await headers() })
  const userType = (session?.user as { userType?: string } | undefined)?.userType
  if (!session || userType !== "admin") return null

  return resolveActiveAdminRole(
    session.user.id,
    (session.user as { email?: string } | undefined)?.email
  )
}

/**
 * Como {@link requireAdmin}, pero además exige estrictamente el rol `SUPER_ADMIN`.
 * Utiliza el rol fresco de la base de datos para revocar privilegios de inmediato
 * si un usuario fue degradado a INVENTORY_OPERATOR o si su rol no es válido.
 */
export async function requireSuperAdmin() {
  return requireAdmin("superadmin")
}
