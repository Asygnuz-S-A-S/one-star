type SignInError = { status?: number; code?: string } | null | undefined

/**
 * Mensaje para un fallo del paso 2 del login (sesión de Better Auth).
 * El paso 1 ya validó correo y clave, así que aquí nunca son "credenciales
 * incorrectas": es el límite de intentos o un error del sistema.
 */
export function signInErrorMessage(error: SignInError): string {
  if (error?.status === 429) {
    return "Demasiados intentos. Intenta de nuevo en 15 minutos."
  }
  const code = error?.code ?? (error?.status ? `HTTP ${error.status}` : "SIN_CODIGO")
  return `Tus datos son correctos, pero no pudimos iniciar la sesión. Avisa a soporte con este código: ${code}.`
}
