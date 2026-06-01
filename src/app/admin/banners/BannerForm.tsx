"use client"

import { useState, useTransition, useRef } from "react"
import { createBanner, updateBanner } from "./actions"

interface BannerData {
  id?: string
  title?: string
  imageUrl?: string
  linkUrl?: string | null
  position?: number
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
}

interface Props {
  initial?: BannerData
  onClose: () => void
}

export default function BannerForm({ initial, onClose }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    formData.set("isActive", String(isActive))

    startTransition(async () => {
      const result = initial?.id
        ? await updateBanner(initial.id, formData)
        : await createBanner(formData)
      if (result.success) {
        onClose()
      } else {
        setError(result.error ?? "Error desconocido.")
      }
    })
  }

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
  const labelClass = "block text-xs font-semibold text-[#4A4A4A] mb-1"

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm px-4 py-2 rounded-lg bg-red-50 text-[#E31C23] border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className={labelClass}>Título *</label>
        <input
          type="text"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>URL de imagen *</label>
        <input
          type="url"
          name="imageUrl"
          required
          defaultValue={initial?.imageUrl ?? ""}
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>URL de destino (link)</label>
        <input
          type="url"
          name="linkUrl"
          defaultValue={initial?.linkUrl ?? ""}
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Posición</label>
        <input
          type="number"
          name="position"
          defaultValue={initial?.position ?? 0}
          min={0}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fecha inicio (opcional)</label>
          <input
            type="date"
            name="startDate"
            defaultValue={initial?.startDate?.slice(0, 10) ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Fecha fin (opcional)</label>
          <input
            type="date"
            name="endDate"
            defaultValue={initial?.endDate?.slice(0, 10) ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-[#E31C23]" : "bg-gray-300"
          }`}
          aria-label="Toggle activo"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-[#4A4A4A]">
          {isActive ? "Activo" : "Inactivo"}
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Guardando…" : initial?.id ? "Actualizar banner" : "Crear banner"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-200 text-[#4A4A4A] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
