import "server-only"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

/**
 * Error de autorización. Se lanza cuando quien invoca una Server Action o ruta
 * protegida no es un administrador. Los callers pueden distinguirlo del resto
 * de errores mediante `instanceof UnauthorizedError`.
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
 * Lanza {@link UnauthorizedError} si no hay sesión de administrador.
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userType = (session?.user as { userType?: string } | undefined)?.userType
  if (!session || userType !== "admin") {
    throw new UnauthorizedError()
  }
  return session
}

/**
 * Igual que {@link requireAdmin} pero devuelve la sesión o `null` en vez de
 * lanzar. Útil en callers que ya usan el patrón `{ success, error }`.
 */
export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  const userType = (session?.user as { userType?: string } | undefined)?.userType
  return session && userType === "admin" ? session : null
}
