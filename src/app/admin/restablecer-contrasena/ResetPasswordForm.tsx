"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { resetAdminPasswordWithTokenAction } from "@/server/actions/admin-recovery.actions"

interface ResetPasswordFormProps {
  token: string
  email: string
}

export default function ResetPasswordForm({ token, email }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [state, action, pending] = useActionState(
    resetAdminPasswordWithTokenAction,
    null
  )

  if (state?.success) {
    return (
      <div className="space-y-5 text-center">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left" data-testid="reset-success-box">
          <p className="font-montserrat text-xs font-semibold text-emerald-900 mb-1">
            Contraseña restablecida con éxito
          </p>
          <p className="font-montserrat text-xs text-emerald-800 leading-relaxed">
            Tu nueva contraseña ha sido configurada. Se han cerrado todas las sesiones activas previas por seguridad.
          </p>
        </div>
        <Link
          href="/admin/login"
          className="inline-block w-full bg-[#E31C23] hover:bg-[#C41920] text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg py-3 transition-colors text-center"
        >
          Iniciar sesión ahora
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <p className="font-montserrat text-xs text-[#4A4A4A] mb-3 leading-relaxed">
          Define una nueva contraseña para la cuenta: <strong className="text-[#1C1C1C]">{email}</strong>
        </p>
      </div>

      {/* Nueva contraseña */}
      <div>
        <label
          htmlFor="password"
          className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1 uppercase tracking-wide"
        >
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#E0E0E0] rounded-lg px-4 pr-12 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
            placeholder="Mínimo 10 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#ABABAB] hover:text-[#4A4A4A]"
            aria-label={showPassword ? "Ocultar" : "Mostrar"}
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1 uppercase tracking-wide"
        >
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          required
          minLength={10}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
          placeholder="Repite la contraseña"
        />
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3" data-testid="reset-error-box">
          <p className="font-montserrat text-xs text-[#E31C23]">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[#E31C23] hover:bg-[#C41920] disabled:opacity-60 text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg py-3 transition-colors mt-2"
      >
        {pending ? "Guardando..." : "Guardar nueva contraseña"}
      </button>

      <div className="text-center pt-2">
        <Link
          href="/admin/login"
          className="font-montserrat text-xs text-[#4A4A4A] hover:text-[#1C1C1C] underline underline-offset-2 transition-colors"
        >
          ← Volver a iniciar sesión
        </Link>
      </div>
    </form>
  )
}
