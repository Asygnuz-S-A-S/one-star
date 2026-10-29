export const ADMIN_ROLES = ["SUPER_ADMIN", "INVENTORY_OPERATOR", "SALES_OPERATOR"] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

/**
 * Áreas de permiso. "superadmin" = solo SUPER_ADMIN: es el valor por defecto de
 * requireAdmin(), así que una acción nueva nace restringida hasta que se le
 * asigne un área a propósito.
 */
export type AdminArea = "inventory" | "sales" | "superadmin"

const ROLE_AREAS: Record<AdminRole, ReadonlySet<AdminArea>> = {
  SUPER_ADMIN: new Set<AdminArea>(["inventory", "sales", "superadmin"]),
  INVENTORY_OPERATOR: new Set<AdminArea>(["inventory"]),
  SALES_OPERATOR: new Set<AdminArea>(["sales"]),
}

/** Fail-closed: rol nulo o desconocido nunca tiene acceso. */
export function roleCanAccessArea(
  role: AdminRole | null | undefined,
  area: AdminArea
): boolean {
  if (!role) return false
  return ROLE_AREAS[role]?.has(area) ?? false
}

/** Páginas de "Operador de Inventario": catálogo, sin datos de clientes ni pedidos. */
export const INVENTORY_OPERATOR_HREFS: ReadonlySet<string> = new Set([
  "/admin",
  "/admin/cuenta",
  "/admin/mi-cuenta",
  "/admin/productos",
  "/admin/productos/importar",
  "/admin/categorias",
  "/admin/marcas",
  "/admin/colores",
])

/** Páginas de "Operador de Ventas": pedidos, clientes y leads. Sin catálogo ni configuración. */
export const SALES_OPERATOR_HREFS: ReadonlySet<string> = new Set([
  "/admin",
  "/admin/cuenta",
  "/admin/mi-cuenta",
  "/admin/pedidos",
  "/admin/clientes",
  "/admin/leads",
  "/admin/pqrs",
])

/** Lista blanca de páginas por rol limitado. SUPER_ADMIN no aparece: entra a todo. */
export const OPERATOR_HREFS: Record<Exclude<AdminRole, "SUPER_ADMIN">, ReadonlySet<string>> = {
  INVENTORY_OPERATOR: INVENTORY_OPERATOR_HREFS,
  SALES_OPERATOR: SALES_OPERATOR_HREFS,
}

/**
 * Regla central de acceso a páginas del admin: lista blanca, así que una
 * página nueva queda restringida a Super Admin hasta que se agregue aquí.
 * "/admin" solo coincide exacto; las demás incluyen sus subrutas
 * (p. ej. /admin/productos/abc123/editar).
 * Devuelve false para cualquier rol nulo, indefinido o desconocido (fail-closed).
 * Ojo: esto protege PÁGINAS; las acciones y rutas API se protegen con requireAdmin(area).
 */
export function canAccessAdminPath(
  role: AdminRole | null | undefined,
  pathname: string
): boolean {
  if (!role) return false
  if (role === "SUPER_ADMIN") return true
  const hrefs = OPERATOR_HREFS[role as Exclude<AdminRole, "SUPER_ADMIN">]
  if (!hrefs) return false

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname
  if (path === "/admin") return true
  for (const href of hrefs) {
    if (href === "/admin") continue
    if (path === href || path.startsWith(`${href}/`)) return true
  }
  return false
}

/**
 * Normaliza y valida un rol de administrador bajo política "fail-closed".
 * Solo devuelve un valor que coincida exactamente con un AdminRole conocido.
 * Cualquier otro caso (nulo, vacío, mayúsculas/minúsculas incorrectas o roles
 * nuevos no reconocidos) devuelve null.
 */
export function normalizeAdminRole(
  role: string | null | undefined
): AdminRole | null {
  return (ADMIN_ROLES as readonly string[]).includes(role ?? "") ? (role as AdminRole) : null
}
