"use client"

import { useState } from "react"
import { submitPqrsAction } from "@/app/pqrs/actions"
import Link from "next/link"

const PQRS_TYPES = [
  {
    value: "CONSULTA",
    label: "Consulta sobre mis datos personales",
    term: "10 días hábiles",
    detail: "Solicitud para conocer qué datos personales tuyos tratamos y su procedencia.",
  },
  {
    value: "RECLAMO",
    label: "Reclamo / Corrección o actualización de datos",
    term: "15 días hábiles",
    detail: "Corrección o actualización de información inexacta o incompleta.",
  },
  {
    value: "SUPRESION",
    label: "Supresión / Eliminación de datos personales",
    term: "15 días hábiles",
    detail: "Eliminación total o parcial de tus datos de nuestras bases de datos.",
  },
  {
    value: "RETIRO_PUBLICIDAD",
    label: "Retiro de autorización para publicidad / Novedades",
    term: "15 días hábiles",
    detail: "Exclusión de listas comerciales y cancelación de mensajes de mercadeo (Ley 2300 de 2023).",
  },
] as const

type PqrsTypeValue = (typeof PQRS_TYPES)[number]["value"]

export default function PqrsForm() {
  const [name, setName] = useState("")
  const [documentType, setDocumentType] = useState<"CC" | "CE" | "NIT" | "PP">("CC")
  const [documentNumber, setDocumentNumber] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [type, setType] = useState<PqrsTypeValue>("CONSULTA")
  const [description, setDescription] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  const activeTypeInfo = PQRS_TYPES.find((t) => t.value === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await submitPqrsAction({
        name,
        documentType,
        documentNumber,
        email,
        phone: phone || undefined,
        type,
        description,
      })

      if (!res.success) {
        setError(res.error ?? "Ocurrió un error al radicar tu solicitud.")
      } else if (res.ticketNumber) {
        setTicketNumber(res.ticketNumber)
      }
    } catch {
      setError("No se pudo conectar con el servidor. Por favor intenta más tarde.")
    } finally {
      setLoading(false)
    }
  }

  if (ticketNumber) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/70 p-6 md:p-8 dark:border-green-800 dark:bg-green-950/30 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/60 flex items-center justify-center mx-auto text-green-700 dark:text-green-300">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="font-barlow font-bold uppercase tracking-wide text-2xl text-[#1C1C1C] dark:text-white">
            Solicitud radicada con éxito
          </h3>
          <p className="mt-1 font-montserrat text-sm text-[#4A4A4A] dark:text-white/70">
            Tu solicitud de Habeas Data ha sido registrada en nuestro sistema oficial.
          </p>
        </div>

        <div className="inline-block rounded-lg bg-white dark:bg-[#1C1C1C] border border-green-300 dark:border-green-700 px-6 py-4 shadow-sm">
          <span className="block font-montserrat text-xs uppercase tracking-wider text-[#4A4A4A] dark:text-white/60">
            Número de radicado oficial
          </span>
          <span className="block font-barlow font-bold text-2xl md:text-3xl text-[#1C1C1C] dark:text-white tracking-widest mt-1">
            {ticketNumber}
          </span>
        </div>

        <p className="max-w-md mx-auto font-montserrat text-xs sm:text-sm text-[#4A4A4A] dark:text-white/70 leading-relaxed">
          Hemos enviado un correo de confirmación a <strong className="text-[#1C1C1C] dark:text-white">{email}</strong>. El área de Administración responderá formalmente dentro del plazo legal aplicable ({activeTypeInfo?.term}).
        </p>

        <div className="pt-4 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setTicketNumber(null)
              setDescription("")
            }}
            className="min-h-11 px-5 py-2.5 rounded-lg border border-[#1C1C1C] dark:border-white text-xs font-montserrat font-bold uppercase tracking-wider hover:bg-[#1C1C1C]/5 transition-colors"
          >
            Radicar otra solicitud
          </button>
          <Link
            href="/"
            className="min-h-11 inline-flex items-center px-6 py-2.5 rounded-lg bg-[#E31C23] text-white text-xs font-montserrat font-bold uppercase tracking-wider hover:bg-[#c9181e] transition-colors"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pqrs-name" className="block font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider mb-1.5">
            Nombre completo <span className="text-[#E31C23]">*</span>
          </label>
          <input
            id="pqrs-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Juan Pérez"
            className="w-full min-h-11 px-3.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
          />
        </div>

        <div>
          <label htmlFor="pqrs-doc-num" className="block font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider mb-1.5">
            Documento de identidad <span className="text-[#E31C23]">*</span>
          </label>
          <div className="flex gap-2">
            <select
              aria-label="Tipo de documento"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as "CC" | "CE" | "NIT" | "PP")}
              className="w-24 shrink-0 min-h-11 px-2.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
            >
              <option value="CC">CC</option>
              <option value="CE">CE</option>
              <option value="NIT">NIT</option>
              <option value="PP">PP</option>
            </select>
            <input
              id="pqrs-doc-num"
              type="text"
              inputMode="numeric"
              required
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Número de identificación"
              className="min-w-0 flex-1 min-h-11 px-3.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pqrs-email" className="block font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider mb-1.5">
            Correo electrónico para respuesta <span className="text-[#E31C23]">*</span>
          </label>
          <input
            id="pqrs-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
            className="w-full min-h-11 px-3.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
          />
        </div>

        <div>
          <label htmlFor="pqrs-phone" className="block font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider mb-1.5">
            Teléfono o WhatsApp (opcional)
          </label>
          <input
            id="pqrs-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="3001234567"
            className="w-full min-h-11 px-3.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
          />
        </div>
      </div>

      <div>
        <label className="block font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider mb-2">
          Tipo de trámite <span className="text-[#E31C23]">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PQRS_TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex flex-col justify-between p-3.5 rounded-lg border cursor-pointer transition-all ${
                type === t.value
                  ? "border-[#E31C23] bg-[#E31C23]/5 shadow-sm ring-1 ring-[#E31C23]"
                  : "border-[#E0E0E0] dark:border-white/15 hover:border-gray-400 bg-white dark:bg-[#151515]"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  name="pqrsType"
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => setType(t.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#E31C23]"
                />
                <div>
                  <span className="block font-montserrat font-semibold text-xs text-[#1C1C1C] dark:text-white">
                    {t.label}
                  </span>
                  <span className="block font-montserrat text-xs text-[#4A4A4A] dark:text-white/60 mt-1">
                    {t.detail}
                  </span>
                </div>
              </div>
              <span className="mt-2 text-[11px] font-montserrat font-medium text-green-700 dark:text-green-400 self-end">
                Término legal: {t.term}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="pqrs-desc" className="font-montserrat text-xs font-semibold text-[#1C1C1C] dark:text-white uppercase tracking-wider">
            Descripción y hechos que sustentan la solicitud <span className="text-[#E31C23]">*</span>
          </label>
          <span className="font-montserrat text-[11px] text-gray-400">
            {description.length} / 2500
          </span>
        </div>
        <textarea
          id="pqrs-desc"
          rows={5}
          required
          maxLength={2500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe de manera clara y precisa tu solicitud, los datos personales objeto de consulta o reclamo y los hechos que fundamentan tu petición..."
          className="w-full p-3.5 rounded-lg border border-[#E0E0E0] dark:border-white/20 bg-white dark:bg-[#151515] font-montserrat text-sm text-[#1C1C1C] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs font-montserrat text-[#E31C23] dark:text-red-300">
          {error}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-12 py-3 px-6 rounded-lg bg-[#E31C23] text-white font-montserrat font-bold text-xs uppercase tracking-wider hover:bg-[#c9181e] disabled:opacity-60 transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Radicando solicitud...</span>
            </>
          ) : (
            <span>Radicar solicitud de Habeas Data</span>
          )}
        </button>
        <p className="mt-2 text-center font-montserrat text-xs text-[#4A4A4A] dark:text-white/60">
          Al radicar esta solicitud autorizas el tratamiento de tus datos para tramitar tu petición conforme a la{" "}
          <Link href="/privacidad" className="text-[#E31C23] underline underline-offset-2">
            Política de Privacidad
          </Link>.
        </p>
      </div>
    </form>
  )
}
