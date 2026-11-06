"use client"

import { useActionState } from "react"
import { requestCustomerPasswordResetAction } from "@/server/actions/customer-recovery.actions"

const inputClass =
  "min-h-11 w-full rounded-lg border border-[#E0E0E0] px-4 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#AAAAAA] focus:border-[#E31C23] focus:outline-none"

export default function RecoveryForm() {
  const [state, action, pending] = useActionState(requestCustomerPasswordResetAction, null)

  if (state?.success) {
    return (
      <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 font-montserrat text-sm text-emerald-900">
        {state.message} Revisa también la carpeta de spam. El enlace vence en 1 hora.
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="font-montserrat text-sm text-[#4A4A4A]">
        Escribe el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.
      </p>
      <label htmlFor="email" className="font-montserrat text-xs font-semibold uppercase tracking-wide text-[#4A4A4A]">
        Correo electrónico
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" placeholder="tu@email.com" className={inputClass} />
      {state?.error && (
        <p role="alert" className="font-montserrat text-xs text-[#E31C23]">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-[#E31C23] py-3.5 font-barlow text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#c41920] disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar enlace"}
      </button>
    </form>
  )
}
