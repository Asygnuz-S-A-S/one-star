"use client"

import { useState, type FormEvent } from "react"
import { landingPath } from "@/lib/landing-paths"

export interface LandingSettingsValue {
  title: string | null
  description: string | null
  isActive: boolean
}

interface Props {
  page: string
  initial: LandingSettingsValue
  save: (input: { page: string; title: string; description: string; isActive: boolean }) => Promise<{ success: boolean; error?: string }>
  onSaved: () => void
}

/** Ajustes de la landing: si se ve en la tienda y cómo aparece en Google. */
export default function LandingPageSettingsForm({ page, initial, save, onSaved }: Props) {
  const [isActive, setIsActive] = useState(initial.isActive)
  const [title, setTitle] = useState(initial.title ?? "")
  const [description, setDescription] = useState(initial.description ?? "")
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const path = landingPath(page)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const result = await save({ page, title, description, isActive })
    setSaving(false)
    setStatus(result.success ? { ok: true, text: isActive ? "Guardado. La landing está activa." : "Guardado. La landing quedó oculta." } : { ok: false, text: result.error ?? "No se pudo guardar" })
    if (result.success) onSaved()
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3" aria-label="Ajustes de la landing">
      <div className="flex items-center justify-between gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-[#1C1C1C]">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-5 w-5 accent-[#E31C23]" />
          {isActive ? "Activa en la tienda" : "Oculta (solo tú la ves)"}
        </label>
        <a href={path} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs font-bold text-[#E31C23] underline underline-offset-4">
          Ver {path}
        </a>
      </div>
      <div>
        <label htmlFor="landing-seo-title" className="text-xs font-bold text-gray-700">Título en Google (opcional)</label>
        <input id="landing-seo-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={70} placeholder="Black Friday One Star: hasta 40 % en tenis" className="mt-1 min-h-11 w-full border bg-white px-3 text-sm" />
      </div>
      <div>
        <label htmlFor="landing-seo-description" className="text-xs font-bold text-gray-700">Descripción en Google (opcional)</label>
        <textarea id="landing-seo-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={160} rows={2} className="mt-1 w-full border bg-white px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={saving} className="min-h-11 rounded-md bg-[#1C1C1C] px-4 text-xs font-bold text-white disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar ajustes"}
      </button>
      {status && <p role={status.ok ? "status" : "alert"} className={`text-xs ${status.ok ? "text-emerald-700" : "text-[#E31C23]"}`}>{status.text}</p>}
    </form>
  )
}
