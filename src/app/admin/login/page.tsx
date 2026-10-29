"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { prepareAdminSignIn } from "@/lib/auth-actions"
import { authClient } from "@/lib/auth-client"
import { signInErrorMessage } from "@/lib/sign-in-error"
import { requestAdminPasswordResetAction } from "@/server/actions/admin-recovery.actions"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRecovering, setIsRecovering] = useState(false)

  const [recoveryState, recoveryAction, recoveryPending] = useActionState(
    requestAdminPasswordResetAction,
    null
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Step 1: validate credentials against AdminUser table and sync BA records
      const prep = await prepareAdminSignIn(email, password)
      if (!prep.success) {
        setError(prep.error)
        return
      }

      // Step 2: create a better-auth session (BA verifies the synced hash)
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/admin",
      })

      if (signInError) {
        setError(signInErrorMessage(signInError))
        return
      }

      router.push("/admin")
      router.refresh()
    } catch {
      setError("Ocurrió un error inesperado. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1C1C] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="font-barlow font-bold text-3xl tracking-widest text-[#1C1C1C]">
            ONE STAR
          </p>
          <p className="font-montserrat text-xs text-[#4A4A4A] mt-1 uppercase tracking-wider">
            {isRecovering ? "Recuperación de Acceso" : "Panel Administración"}
          </p>
        </div>

        {isRecovering ? (
          /* Formulario de recuperación de contraseña */
          <form action={recoveryAction} className="space-y-5">
            <div>
              <p className="font-montserrat text-xs text-[#4A4A4A] mb-4 leading-relaxed">
                Ingresa el correo electrónico de tu cuenta de administrador para recibir un enlace de recuperación seguro.
              </p>
              <label
                htmlFor="recovery-email"
                className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={email}
                className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
                placeholder="admin@onestar.com"
              />
            </div>

            {/* Mensaje de respuesta neutra (siempre idéntica) */}
            {recoveryState?.message && (
              <div
                className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3"
                data-testid="recovery-success-message"
              >
                <p className="font-montserrat text-xs text-emerald-800 leading-relaxed">
                  {recoveryState.message}
                </p>
              </div>
            )}

            {/* Error si ocurre en validación */}
            {recoveryState?.error && (
              <div
                className="bg-red-50 border border-red-200 rounded-lg px-4 py-3"
                data-testid="recovery-error-message"
              >
                <p className="font-montserrat text-xs text-[#E31C23] leading-relaxed">
                  {recoveryState.error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={recoveryPending}
              className="w-full bg-[#E31C23] hover:bg-[#C41920] disabled:opacity-60 text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg py-3 transition-colors"
            >
              {recoveryPending ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRecovering(false)}
                className="font-montserrat text-xs text-[#4A4A4A] hover:text-[#1C1C1C] underline underline-offset-2 transition-colors"
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          </form>
        ) : (
          /* Formulario de login normal */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
                placeholder="admin@onestar.com"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block font-montserrat text-xs font-medium text-[#4A4A4A] uppercase tracking-wide"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setIsRecovering(true)}
                  className="font-montserrat text-xs text-[#E31C23] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[#E0E0E0] px-4 pr-14 font-montserrat text-sm text-[#1C1C1C] transition-colors placeholder:text-[#ABABAB] focus:border-[#E31C23] focus:outline-none focus:ring-1 focus:ring-[#E31C23]"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-[#ABABAB] transition-colors hover:text-[#4A4A4A]"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="font-montserrat text-xs text-[#E31C23]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E31C23] hover:bg-[#C41920] disabled:opacity-60 text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg py-3 transition-colors"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
