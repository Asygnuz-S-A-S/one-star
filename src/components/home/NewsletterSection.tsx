"use client"

import { useState } from "react"

export default function NewsletterSection() {
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
    <section className="bg-[#1C1C1C] py-16 md:py-24 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo mark */}
        <div className="flex justify-center mb-6">
          <span className="w-8 h-1 bg-[#E31C23]" />
        </div>

        <h2 className="font-[var(--font-barlow)] font-black uppercase text-white text-3xl md:text-5xl tracking-tight leading-none mb-4">
          Únete a One Star
        </h2>
        <p className="font-[var(--font-montserrat)] text-white/60 text-sm md:text-base leading-relaxed mb-10">
          Accede primero a los lanzamientos y ofertas exclusivas.
          <br className="hidden md:block" />
          Sin spam, solo lo mejor del mundo sneaker.
        </p>

        {success ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#E31C23] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>
            <p className="font-[var(--font-barlow)] font-bold text-white text-xl uppercase tracking-wide">
              ¡Gracias! Pronto recibirás novedades.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError("")
                }}
                placeholder="tucorreo@email.com"
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/30 font-[var(--font-montserrat)] text-sm px-5 py-4 focus:outline-none focus:border-[#E31C23] transition-colors"
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

        <p className="font-[var(--font-montserrat)] text-white/30 text-xs mt-6">
          Al suscribirte aceptas nuestra política de privacidad.
        </p>
      </div>
    </section>
  )
}
