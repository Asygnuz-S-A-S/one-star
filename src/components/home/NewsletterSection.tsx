"use client"

import { useState } from "react"

export default function NewsletterSection({ config = {} }: { config?: Record<string, unknown> }) {
  const title = typeof config.title === "string" ? config.title : "Únete a One Star"
  const subtitle = typeof config.subtitle === "string"
    ? config.subtitle
    : "Accede primero a los lanzamientos y ofertas exclusivas.\nSin spam, solo lo mejor del mundo sneaker."
  const theme = config.theme === "light" ? "light" : "dark" // default dark for newsletter

  const isDark = theme === "dark"

  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!email.trim()) {
      setError("Por favor ingresa tu correo electrónico.")
      return
    }

    if (!validateEmail(email)) {
      setError("Ingresa un correo electrónico válido.")
      return
    }

    setSuccess(true)
  }

  return (
    <section className={`bg-background text-foreground py-16 md:py-24 px-4 ${isDark ? "dark" : ""}`}>
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <span className="w-8 h-1 bg-[#E31C23]" />
        </div>

        <h2 className="font-[var(--font-barlow)] font-black uppercase text-3xl md:text-5xl tracking-tight leading-none mb-4 whitespace-pre-wrap text-foreground">
          {title}
        </h2>
        <p className="font-[var(--font-montserrat)] text-sm md:text-base leading-relaxed mb-10 whitespace-pre-wrap text-[var(--text-secondary)]">
          {subtitle}
        </p>

        {success ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#E31C23] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <p className="font-[var(--font-barlow)] font-bold text-xl uppercase tracking-wide text-foreground">
              ¡Gracias! Pronto recibirás novedades.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Ingresa tu correo"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError("")
                }}
                className="flex-1 px-4 py-4 md:py-0 border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] font-[var(--font-montserrat)] text-sm focus:outline-none focus:border-[#E31C23] focus:ring-1 focus:ring-[#E31C23] transition-colors"
              />
              <button
                type="submit"
                className="bg-[#E31C23] hover:bg-[#c51920] text-white font-[var(--font-barlow)] font-bold uppercase tracking-widest text-sm px-8 py-4 transition-colors duration-200 shrink-0"
              >
                Suscribirse
              </button>
            </div>

            {error && (
              <p className="font-[var(--font-montserrat)] text-[#E31C23] text-xs mt-3">
                {error}
              </p>
            )}
          </form>
        )}

        <p className="font-[var(--font-montserrat)] text-[var(--text-muted)] text-xs mt-6">
          Al suscribirte aceptas nuestra política de privacidad.
        </p>
      </div>
    </section>
  )
}
