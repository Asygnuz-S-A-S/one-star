"use client"

import { useActionState, useState } from "react"
import { changeAdminOwnPasswordAction } from "@/server/actions/admin-recovery.actions"

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const [state, action, pending] = useActionState(
    changeAdminOwnPasswordAction,
    null
  )

  return (
    <form action={action} className="space-y-5">
      {state?.success && (
        <div
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left"
          data-testid="change-password-success"
        >
          <p className="font-montserrat text-xs font-semibold text-emerald-900 mb-1">
            Contraseña actualizada
          </p>
          <p className="font-montserrat text-xs text-emerald-800 leading-relaxed">
            {state.message ?? "Tu contraseña ha sido actualizada exitosamente. Las demás sesiones han sido cerradas."}
          </p>
        </div>
      )}

      {state?.error && (
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 text-left"
          data-testid="change-password-error"
        >
          <p className="font-montserrat text-xs text-[#E31C23] leading-relaxed">
            {state.error}
          </p>
        </div>
      )}

      {/* Contraseña actual */}
      <div>
        <label
          htmlFor="currentPassword"
          className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide"
        >
          Contraseña actual
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-[#E0E0E0] rounded-lg px-4 pr-12 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
            placeholder="Ingresa tu contraseña actual"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#ABABAB] hover:text-[#4A4A4A]"
            aria-label={showCurrent ? "Ocultar" : "Mostrar"}
          >
            {showCurrent ? (
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

      {/* Nueva contraseña */}
      <div>
        <label
          htmlFor="newPassword"
          className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide"
        >
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            required
            minLength={10}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-[#E0E0E0] rounded-lg px-4 pr-12 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
            placeholder="Mínimo 10 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-[#ABABAB] hover:text-[#4A4A4A]"
            aria-label={showNew ? "Ocultar" : "Mostrar"}
          >
            {showNew ? (
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

      {/* Confirmar nueva contraseña */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block font-montserrat text-xs font-medium text-[#4A4A4A] mb-1.5 uppercase tracking-wide"
        >
          Confirmar nueva contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showNew ? "text" : "password"}
          required
          minLength={10}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2.5 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
          placeholder="Repite la nueva contraseña"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-[#E31C23] hover:bg-[#C41920] disabled:opacity-60 text-white font-barlow font-bold text-sm uppercase tracking-widest rounded-lg px-6 py-3 transition-colors"
        >
          {pending ? "Actualizando..." : "Actualizar contraseña"}
        </button>
      </div>
    </form>
  )
}
