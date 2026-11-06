"use client"

import { useActionState } from "react"
import Link from "next/link"
import { requestCustomerPasswordResetAction } from "@/server/actions/customer-recovery.actions"

export default function RecuperarContrasenaPage() {
  const [state, action, pending] = useActionState(requestCustomerPasswordResetAction, null)

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm px-8 py-10">
        <h1 className="font-barlow font-bold text-xl tracking-wide text-[#1C1C1C] uppercase text-center">
          Recuperar contraseña
        </h1>

        {state?.success ? (
          <div className="mt-6 space-y-6 text-center">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-left font-montserrat text-sm text-emerald-900" role="status">
              {state.message}
            </p>
            <Link href="/login" className="font-montserrat text-sm font-semibold text-[#E31C23] hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form action={action} className="mt-6 flex flex-col gap-4">
            <p className="font-montserrat text-sm text-[#4A4A4A]">
              Escribe el correo de tu cuenta y te enviamos un enlace para crear una nueva contraseña.
            </p>
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="border border-[#E0E0E0] rounded-lg px-4 py-3 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#E31C23] transition-colors"
                placeholder="tu@email.com"
              />
            </div>
            {state?.error && (
              <p className="font-montserrat text-xs text-[#E31C23] text-center" role="alert">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase py-3.5 rounded-lg hover:bg-[#c41920] transition-colors disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar enlace"}
            </button>
            <Link href="/login" className="text-center font-montserrat text-xs text-[#4A4A4A] hover:text-[#E31C23]">
              Volver a iniciar sesión
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
