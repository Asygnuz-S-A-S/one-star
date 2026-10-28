"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { getGuestInviteDetails, completeGuestAccountCreation } from "./actions"

export default function CrearCuentaPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-[#E31C23]/10" />
            <p className="font-montserrat text-sm text-[#4A4A4A]">Cargando invitación...</p>
          </div>
        </main>
      }
    >
      <CrearCuentaContent />
    </Suspense>
  )
}

function CrearCuentaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token") ?? ""

  const [loading, setLoading] = useState(Boolean(token))
  const [valid, setValid] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [joinClub, setJoinClub] = useState(true)
  const [newsletter, setNewsletter] = useState(true)

  const [ordersCount, setOrdersCount] = useState<number | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState(token ? "" : "No se proporcionó ningún token de invitación.")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => {
    if (!token) return

    let cancelled = false
    getGuestInviteDetails(token).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.valid && res.email) {
        setValid(true)
        setEmail(res.email)
        if (res.suggestedName) setName(res.suggestedName)
        if (res.suggestedLastName) setLastName(res.suggestedLastName)
        setOrdersCount(res.ordersCount)
      } else {
        setValid(false)
        setErrorMessage(res.error ?? "El enlace de invitación no es válido o ya ha expirado.")
      }
    })

    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")

    if (!termsAccepted) {
      setFormError("Debes aceptar los términos y condiciones y la política de tratamiento de datos.")
      return
    }

    if (password.length < 8) {
      setFormError("La contraseña debe tener al menos 8 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.")
      return
    }

    setSubmitting(true)

    const result = await completeGuestAccountCreation({
      token,
      name,
      lastName,
      password,
      confirmPassword,
      termsAccepted: true,
      newsletter,
      joinClub,
    })

    if (!result.success) {
      setSubmitting(false)
      setFormError(result.error ?? "No se pudo crear la cuenta. Inténtalo de nuevo.")
      return
    }

    // Iniciar sesión con la credencial recién creada
    try {
      const signInRes = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/cuenta",
      })

      if (signInRes.error) {
        // Redirige al login con correo pre-llenado si el auto-login falla
        router.push(`/login?email=${encodeURIComponent(email)}&activated=1`)
      } else {
        router.push("/cuenta")
      }
    } catch {
      router.push(`/login?email=${encodeURIComponent(email)}&activated=1`)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#E31C23] border-t-transparent" />
          <p className="font-montserrat text-sm text-[#4A4A4A]">Verificando tu invitación...</p>
        </div>
      </main>
    )
  }

  if (!valid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-[#E31C23]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-barlow text-2xl font-bold uppercase tracking-wide text-[#1C1C1C]">
            Enlace no disponible
          </h1>
          <p className="mt-2 font-montserrat text-sm text-[#4A4A4A]">
            {errorMessage}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full rounded-lg bg-[#E31C23] px-4 py-3 font-barlow text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c21920]"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="w-full rounded-lg border border-[#1C1C1C] px-4 py-3 font-barlow text-sm font-bold uppercase tracking-wider text-[#1C1C1C] transition-colors hover:bg-[#1C1C1C] hover:text-white"
            >
              Crear nueva cuenta
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F5] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="font-barlow text-2xl font-bold tracking-tight text-[#1C1C1C]">
            ONE STAR
          </Link>
          <h1 className="mt-4 font-barlow text-2xl font-bold uppercase tracking-wide text-[#1C1C1C]">
            Crea tu contraseña
          </h1>
          <p className="mt-1 font-montserrat text-sm text-[#4A4A4A]">
            Activa tu cuenta para consultar {ordersCount && ordersCount > 1 ? `tus ${ordersCount} pedidos` : "tu pedido"} y comprar más rápido.
          </p>
        </div>

        {formError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-montserrat text-[#E31C23]">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-montserrat font-medium uppercase tracking-wide text-[#4A4A4A] mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-montserrat text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-montserrat font-medium uppercase tracking-wide text-[#4A4A4A] mb-1">
                Nombre <span className="text-[#E31C23]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:border-[#1C1C1C] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-montserrat font-medium uppercase tracking-wide text-[#4A4A4A] mb-1">
                Apellido <span className="text-[#E31C23]">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Pérez"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:border-[#1C1C1C] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-montserrat font-medium uppercase tracking-wide text-[#4A4A4A] mb-1">
              Contraseña <span className="text-[#E31C23]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 font-montserrat text-sm text-[#1C1C1C] focus:border-[#1C1C1C] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-montserrat font-medium uppercase tracking-wide text-[#4A4A4A] mb-1">
              Confirmar contraseña <span className="text-[#E31C23]">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 font-montserrat text-sm text-[#1C1C1C] focus:border-[#1C1C1C] focus:outline-none"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#E31C23]"
              />
              <span className="text-xs font-montserrat text-[#4A4A4A]">
                Acepto los{" "}
                <Link href="/terminos" target="_blank" className="underline hover:text-[#1C1C1C]">
                  términos y condiciones
                </Link>{" "}
                y la política de tratamiento de datos personales. <span className="text-[#E31C23]">*</span>
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={joinClub}
                onChange={(e) => setJoinClub(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#E31C23]"
              />
              <span className="text-xs font-montserrat text-[#4A4A4A]">
                Unirme gratis a One Star Club para promociones exclusivas
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#E31C23]"
              />
              <span className="text-xs font-montserrat text-[#4A4A4A]">
                Recibir noticias, ofertas y lanzamientos por correo
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#E31C23] font-barlow text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#c21920] disabled:bg-gray-400"
          >
            {submitting ? "Activando cuenta..." : "Crear cuenta y ver mis pedidos"}
          </button>
        </form>
      </div>
    </main>
  )
}
