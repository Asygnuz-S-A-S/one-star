"use client"

import { Suspense, useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { prepareCustomerSignIn } from "@/lib/auth-actions"
import { authClient } from "@/lib/auth-client"
import { getSafeCallbackUrl } from "@/lib/auth-redirect"
import {
  getCheckoutSessionStorage,
  peekCheckoutRegistrationPrefill,
  type CheckoutRegistrationPrefill,
} from "@/lib/checkout-draft"
import { registerCustomer } from "./actions"

const BRANDS = [
  "Nike",
  "New Balance",
  "Hoka",
  "Veja",
  "On Running",
  "Adidas",
  "Asics",
  "Sin preferencia",
]

interface FormErrors {
  name?: string
  lastName?: string
  cedula?: string
  phone?: string
  birthDate?: string
  email?: string
  password?: string
  confirmPassword?: string
  preferredBrand?: string
  gender?: string
  terms?: string
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="font-montserrat text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={`w-full rounded-lg border bg-[var(--input-bg)] px-4 py-3 pr-12 font-montserrat text-sm text-[var(--input-text)] placeholder:text-[var(--text-secondary)] focus:border-[#E31C23] focus:outline-none transition-colors ${
            error ? "border-[#E31C23]" : "border-[var(--input-border)]"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[#E31C23] transition-colors"
        >
          {show ? (
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
      {error && (
        <p className="font-montserrat text-xs text-[#E31C23] dark:text-[#ff7377]">{error}</p>
      )}
    </div>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="font-montserrat text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="font-montserrat text-xs text-[#E31C23] dark:text-[#ff7377]">{error}</p>
      )}
    </div>
  )
}

const inputClass = (error?: string) =>
  `rounded-lg border bg-[var(--input-bg)] px-4 py-3 font-montserrat text-sm text-[var(--input-text)] placeholder:text-[var(--text-secondary)] focus:border-[#E31C23] focus:outline-none transition-colors ${
    error ? "border-[#E31C23]" : "border-[var(--input-border)]"
  }`

export default function RegistroPage() {
  return (
    <Suspense fallback={<RegistroFallback />}>
      <RegistroForm />
    </Suspense>
  )
}

function RegistroFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-12 text-[var(--text-primary)]">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-surface-1 px-8 py-10 text-center shadow-sm"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="mx-auto mb-5 h-12 w-12 animate-pulse rounded-full bg-[#E31C23]/10" />
        <p className="font-montserrat text-sm text-[var(--text-secondary)]">Preparando el registro...</p>
      </div>
    </main>
  )
}

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"))
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
  const editedPrefillFields = useRef(new Set<keyof CheckoutRegistrationPrefill>())

  const [name, setName] = useState("")
  const [lastName, setLastName] = useState("")
  const [cedula, setCedula] = useState("")
  const [phone, setPhone] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [preferredBrand, setPreferredBrand] = useState("")
  const [gender, setGender] = useState("")
  const [terms, setTerms] = useState(false)
  const [newsletter, setNewsletter] = useState(false)

  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailExists, setEmailExists] = useState(false)

  useEffect(() => {
    if (callbackUrl !== "/checkout") return

    const prefill = peekCheckoutRegistrationPrefill(getCheckoutSessionStorage())
    if (!prefill) return

    if (!editedPrefillFields.current.has("name")) setName(prefill.name)
    if (!editedPrefillFields.current.has("lastName")) setLastName(prefill.lastName)
    if (!editedPrefillFields.current.has("phone")) setPhone(prefill.phone)
    if (!editedPrefillFields.current.has("email")) setEmail(prefill.email)
    if (!editedPrefillFields.current.has("newsletter")) setNewsletter(prefill.newsletter)
  }, [callbackUrl])

  // Real-time email check with debounce
  const checkEmail = useCallback(async (value: string) => {
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailExists(false)
      return
    }
    setEmailChecking(true)
    try {
      const res = await fetch(
        `/api/auth/check-email?email=${encodeURIComponent(value)}`
      )
      const json = (await res.json()) as { exists: boolean }
      setEmailExists(json.exists)
    } catch {
      // silently ignore
    } finally {
      setEmailChecking(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void checkEmail(email)
    }, 600)
    return () => clearTimeout(timer)
  }, [email, checkEmail])

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!name.trim()) newErrors.name = "El nombre es requerido."
    if (!lastName.trim()) newErrors.lastName = "El apellido es requerido."
    if (!cedula.trim() || !/^\d+$/.test(cedula))
      newErrors.cedula = "Ingresa un número de cédula válido."
    if (!phone.trim() || !/^\d{10}$/.test(phone))
      newErrors.phone = "El teléfono debe tener 10 dígitos."
    if (!birthDate) newErrors.birthDate = "La fecha de nacimiento es requerida."
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Ingresa un correo válido."
    if (emailExists) newErrors.email = "Este correo ya está registrado."
    if (!password || password.length < 8)
      newErrors.password = "La contraseña debe tener mínimo 8 caracteres."
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Las contraseñas no coinciden."
    if (!preferredBrand) newErrors.preferredBrand = "Selecciona una marca."
    if (!gender) newErrors.gender = "Selecciona un género."
    if (!terms) newErrors.terms = "Debes aceptar los términos y condiciones."

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError("")
    if (!validate()) return

    setLoading(true)
    const result = await registerCustomer({
      email,
      password,
      name,
      lastName,
      cedula,
      phone,
      birthDate,
      preferredBrand,
      gender,
    })

    if (!result.success) {
      setSubmitError(result.error ?? "Ocurrió un error. Intenta de nuevo.")
      setLoading(false)
      return
    }

    // Auto sign-in after registration
    // Syncs BA records using the hash just created during registration
    const prep = await prepareCustomerSignIn(email, password)

    setLoading(false)

    if (!prep.success) {
      setSubmitError("Registro exitoso. Por favor inicia sesión.")
      router.push(loginUrl)
      return
    }

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: callbackUrl,
    })

    if (signInError) {
      router.push(loginUrl)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-12 text-[var(--text-primary)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-surface-1 px-8 py-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#E31C23" aria-hidden="true">
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" />
            </svg>
            <span className="font-barlow font-bold text-2xl tracking-widest text-[var(--text-primary)] uppercase">
              One Star
            </span>
          </div>
          <h1 className="mt-2 font-barlow text-xl font-bold uppercase tracking-wide text-[var(--text-primary)]">
            Crear cuenta
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Nombre */}
          <Field id="name" label="Nombre" error={errors.name}>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                editedPrefillFields.current.add("name")
                setName(e.target.value)
              }}
              placeholder="Tu nombre"
              className={inputClass(errors.name)}
            />
          </Field>

          {/* Apellido */}
          <Field id="lastName" label="Apellido" error={errors.lastName}>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => {
                editedPrefillFields.current.add("lastName")
                setLastName(e.target.value)
              }}
              placeholder="Tu apellido"
              className={inputClass(errors.lastName)}
            />
          </Field>

          {/* Cédula */}
          <Field id="cedula" label="Cédula" error={errors.cedula}>
            <input
              id="cedula"
              type="text"
              inputMode="numeric"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              placeholder="Número de cédula"
              className={inputClass(errors.cedula)}
            />
          </Field>

          {/* Teléfono */}
          <Field id="phone" label="Teléfono" error={errors.phone}>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => {
                editedPrefillFields.current.add("phone")
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }}
              placeholder="3001234567 (10 dígitos)"
              className={inputClass(errors.phone)}
            />
          </Field>

          {/* Fecha de nacimiento */}
          <Field id="birthDate" label="Fecha de nacimiento" error={errors.birthDate}>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={`${inputClass(errors.birthDate)} dark:[color-scheme:dark]`}
            />
          </Field>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="font-montserrat text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  editedPrefillFields.current.add("email")
                  setEmail(e.target.value)
                }}
                autoComplete="email"
                placeholder="tu@email.com"
                className={`w-full ${inputClass(errors.email)}`}
              />
              {emailChecking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-montserrat text-xs text-[var(--text-secondary)]">
                  ...
                </span>
              )}
            </div>
            {errors.email && (
              <p className="font-montserrat text-xs text-[#E31C23] dark:text-[#ff7377]">
                {errors.email}
              </p>
            )}
          </div>

          {/* Contraseña */}
          <PasswordInput
            id="password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />

          {/* Confirmar contraseña */}
          <PasswordInput
            id="confirmPassword"
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
          />

          {/* Marca preferida */}
          <Field id="preferredBrand" label="Marca de preferencia" error={errors.preferredBrand}>
            <select
              id="preferredBrand"
              value={preferredBrand}
              onChange={(e) => setPreferredBrand(e.target.value)}
              className={`${inputClass(errors.preferredBrand)} dark:[color-scheme:dark]`}
            >
              <option value="">Selecciona una marca</option>
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>

          {/* Género */}
          <div className="flex flex-col gap-2">
            <span className="font-montserrat text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Género
            </span>
            <div className="flex gap-6">
              {[
                { value: "hombre", label: "Hombre" },
                { value: "mujer", label: "Mujer" },
              ].map((g) => (
                <label
                  key={g.value}
                  className="flex cursor-pointer items-center gap-2 font-montserrat text-sm text-[var(--text-primary)]"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g.value}
                    checked={gender === g.value}
                    onChange={() => setGender(g.value)}
                    className="accent-[#E31C23]"
                  />
                  {g.label}
                </label>
              ))}
            </div>
            {errors.gender && (
              <p className="font-montserrat text-xs text-[#E31C23] dark:text-[#ff7377]">
                {errors.gender}
              </p>
            )}
          </div>

          {/* Términos */}
          <div className="flex flex-col gap-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                className="mt-0.5 accent-[#E31C23] shrink-0"
              />
              <span className="font-montserrat text-xs text-[var(--text-secondary)]">
                Acepto los{" "}
                <Link
                  href="/terminos"
                  className="text-[#E31C23] hover:underline dark:text-[#ff7377]"
                >
                  términos y condiciones
                </Link>{" "}
                y la{" "}
                <Link
                  href="/privacidad"
                  className="text-[#E31C23] hover:underline dark:text-[#ff7377]"
                >
                  política de privacidad
                </Link>
              </span>
            </label>
            {errors.terms && (
              <p className="ml-6 font-montserrat text-xs text-[#E31C23] dark:text-[#ff7377]">
                {errors.terms}
              </p>
            )}
          </div>

          {/* Newsletter */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => {
                editedPrefillFields.current.add("newsletter")
                setNewsletter(e.target.checked)
              }}
              className="mt-0.5 accent-[#E31C23] shrink-0"
            />
            <span className="font-montserrat text-xs text-[var(--text-secondary)]">
              Quiero recibir ofertas y novedades
            </span>
          </label>

          {/* Submit error */}
          {submitError && (
            <p
              className="text-center font-montserrat text-xs text-[#E31C23] dark:text-[#ff7377]"
              role="alert"
            >
              {submitError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-[#E31C23] text-white font-barlow font-bold text-sm tracking-widest uppercase py-3.5 rounded-lg hover:bg-[#c41920] transition-colors disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-8 text-center font-montserrat text-sm text-[var(--text-secondary)]">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={loginUrl}
            className="font-semibold text-[#E31C23] hover:underline dark:text-[#ff7377]"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
