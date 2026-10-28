export const ADMIN_ROLES = ["SUPER_ADMIN", "INVENTORY_OPERATOR"] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

/** Único alcance de "Operador de Inventario" — todo lo demás requiere Super Admin. */
export const INVENTORY_OPERATOR_HREFS: ReadonlySet<string> = new Set([
  "/admin",
  "/admin/cuenta",
  "/admin/mi-cuenta",
  "/admin/pedidos",
  "/admin/productos",
  "/admin/productos/importar",
  "/admin/categorias",
  "/admin/marcas",
  "/admin/colores",
])

/**
 * Regla central de acceso a páginas del admin: lista blanca, así que una
 * página nueva queda restringida a Super Admin hasta que se agregue aquí.
 * "/admin" solo coincide exacto; las demás incluyen sus subrutas
 * (p. ej. /admin/productos/abc123/editar).
 * Devuelve false para cualquier rol nulo, indefinido o desconocido (fail-closed).
 */
export function canAccessAdminPath(
  role: AdminRole | null | undefined,
  pathname: string
): boolean {
  if (!role) return false
  if (role === "SUPER_ADMIN") return true
  if (role !== "INVENTORY_OPERATOR") return false

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  if (path === "/admin") return true
  for (const href of INVENTORY_OPERATOR_HREFS) {
    if (href === "/admin") continue
    if (path === href || path.startsWith(`${href}/`)) return true
  }
  return false
}

/**
 * Normaliza y valida un rol de administrador bajo política "fail-closed".
 * Si el valor coincide exactamente con un AdminRole conocido ("SUPER_ADMIN" o "INVENTORY_OPERATOR"),
 * lo devuelve. Para cualquier otro caso (nulo, indefinido, vacío, errores de escritura,
 * mayúsculas/minúsculas incorrectas o roles nuevos no reconocidos), devuelve null.
 */
export function normalizeAdminRole(
  role: string | null | undefined
): AdminRole | null {
  if (role === "SUPER_ADMIN" || role === "INVENTORY_OPERATOR") {
    return role
  }
  return null
}
