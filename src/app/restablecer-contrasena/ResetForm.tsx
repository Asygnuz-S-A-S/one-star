"use client"

import { useActionState } from "react"
import Link from "next/link"
import { resetCustomerPasswordAction } from "@/server/actions/customer-recovery.actions"

const INPUT =
  "border border-[#E0E0E0] rounded-lg px-4 py-3 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#E31C23] transition-colors"
const LABEL = "font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide"

export default function ResetForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(resetCustomerPasswordAction, null)

  if (state?.success) {
    return (
      <div className="mt-6 space-y-6 text-center">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left font-montserrat text-sm text-emerald-900" role="status">
          {state.message}
        </p>
        <Link href="/login" className="inline-block w-full rounded-lg bg-[#E31C23] py-3.5 font-barlow text-sm font-bold uppercase tracking-widest text-white hover:bg-[#c41920]">
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <p className="font-montserrat text-sm text-[#4A4A4A]">
        Cuenta: <strong className="text-[#1C1C1C]">{email}</strong>
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className={LABEL}>Nueva contraseña</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" className={INPUT} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className={LABEL}>Confirmar contraseña</label>
        <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" placeholder="Repite la contraseña" className={INPUT} />
      </div>
      {state?.error && (
        <p className="font-montserrat text-xs text-[#E31C23] text-center" role="alert">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase py-3.5 rounded-lg hover:bg-[#c41920] transition-colors disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  )
}
