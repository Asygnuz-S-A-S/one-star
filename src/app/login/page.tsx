"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { prepareCustomerSignIn } from "@/lib/auth-actions"
import { authClient } from "@/lib/auth-client"
import { getSafeCallbackUrl } from "@/lib/auth-redirect"

function StarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="#E31C23"
      aria-hidden="true"
    >
      <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"))
  const registerUrl = `/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Step 1: validate credentials and sync BA records
    const prep = await prepareCustomerSignIn(email, password)

    setLoading(false)

    if (!prep.success) {
      setError(prep.error)
      return
    }

    // Step 2: create better-auth session
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: callbackUrl,
    })

    if (signInError) {
      setError("Email o contraseña incorrectos.")
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm px-8 py-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <StarIcon />
            <span className="font-barlow font-bold text-2xl tracking-widest text-[#1C1C1C] uppercase">
              One Star
            </span>
          </div>
          <h1 className="font-barlow font-bold text-xl tracking-wide text-[#1C1C1C] uppercase mt-2">
            Iniciar Sesión
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-[#E0E0E0] rounded-lg px-4 py-3 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#E31C23] transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="font-montserrat text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide"
              >
                Contraseña
              </label>
              <Link
                href="/recuperar-contrasena"
                className="font-montserrat text-xs text-[#E31C23] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E0E0E0] rounded-lg px-4 py-3 pr-12 font-montserrat text-sm text-[#1C1C1C] placeholder:text-[#AAAAAA] focus:outline-none focus:border-[#E31C23] transition-colors"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A4A] hover:text-[#E31C23] transition-colors"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="font-montserrat text-xs text-[#E31C23] text-center" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase py-3.5 rounded-lg hover:bg-[#c41920] transition-colors disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[#E0E0E0]" />
          <span className="font-montserrat text-xs text-[#4A4A4A]">o</span>
          <div className="flex-1 h-px bg-[#E0E0E0]" />
        </div>

        {/* Google — TODO: configurar Google provider en auth.ts */}
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-3 border border-[#E0E0E0] rounded-lg py-3 font-montserrat text-sm text-[#4A4A4A] hover:border-[#1C1C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        {/* Registro */}
        <p className="mt-8 text-center font-montserrat text-sm text-[#4A4A4A]">
          ¿No tienes cuenta?{" "}
          <Link href={registerUrl} className="text-[#E31C23] font-semibold hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  )
}
