"use client"

import { useState, useTransition } from "react"
import type { HomeGridBlock } from "@prisma/client"
import type { LandingBuilderActions } from "@/types/landing-builder-actions"

interface Props {
  actions: Pick<LandingBuilderActions, "createGridBlock" | "updateGridBlock">
  initial?: HomeGridBlock
  onClose: () => void
}

export default function HomeGridForm({ actions, initial, onClose }: Props) {
  const { createGridBlock, updateGridBlock } = actions
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [isPending, startTransition] = useTransition()
  const presetAppearances = ["bg-white", "bg-[#1C1C1C]", "bg-[#E31C23]"]
  const usesLegacyAppearance = Boolean(initial?.bgColor && !presetAppearances.includes(initial.bgColor))

  async function actionHandler(formData: FormData) {
    setError(null)
    setSaveState("saving")
    startTransition(async () => {
      try {
        const res = initial
          ? await updateGridBlock(initial.id, formData)
          : await createGridBlock(formData)

        if (res.success) {
          setSaveState("saved")
          window.setTimeout(onClose, 500)
        } else {
          setError(res.error || "Ocurrió un error inesperado.")
          setSaveState("error")
        }
      } catch {
        setError("No se pudo guardar el bloque. Intenta de nuevo.")
        setSaveState("error")
      }
    })
  }

  return (
    <form action={actionHandler} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="label" className="block text-sm font-medium text-[#4A4A4A] mb-1">
          Texto del bloque *
        </label>
        <input
          id="label"
          name="label"
          type="text"
          defaultValue={initial?.label}
          required
          placeholder="Ej: SALE"
          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div>
        <label htmlFor="href" className="block text-sm font-medium text-[#4A4A4A] mb-1">
          Enlace (href) *
        </label>
        <input
          id="href"
          name="href"
          type="text"
          list="collection-destinations"
          defaultValue={initial?.href}
          required
          placeholder="Ej: /sale"
          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
        <datalist id="collection-destinations"><option value="/">Inicio</option><option value="/sale">Sale</option><option value="/lanzamientos">Lanzamientos</option><option value="/productos">Catálogo</option><option value="/accesorios">Accesorios</option></datalist>
        <p className="mt-1 text-xs text-gray-500">Elige una ruta interna. Una URL https se mostrará como enlace externo.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="bgColor" className="block text-sm font-medium text-[#4A4A4A] mb-1">
            Apariencia *
          </label>
          <select
            id="bgColor"
            name="bgColor"
            defaultValue={initial?.bgColor || "bg-[#1C1C1C]"}
            required
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          >
            {usesLegacyAppearance && <option value={initial?.bgColor}>Estilo avanzado existente</option>}
            <option value="bg-white">Claro</option>
            <option value="bg-[#1C1C1C]">Carbón</option>
            <option value="bg-[#E31C23]">One Star rojo</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">Los estilos avanzados existentes se conservan; los nuevos usan estos presets.</p>
        </div>
        <div>
          <label htmlFor="emoji" className="block text-sm font-medium text-[#4A4A4A] mb-1">
            Emoji / Icono
          </label>
          <input
            id="emoji"
            name="emoji"
            type="text"
            defaultValue={initial?.emoji || ""}
            placeholder="Ej: 🚀"
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-[#4A4A4A] mb-1">
            Posición
          </label>
          <input
            id="position"
            name="position"
            type="number"
            defaultValue={initial?.position ?? 0}
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer py-2">
            <input
              type="checkbox"
              name="darkText"
              value="true"
              defaultChecked={initial?.darkText}
              className="accent-black w-4 h-4"
            />
            <span className="text-sm font-medium text-[#4A4A4A]">Texto Oscuro</span>
          </label>
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer py-2">
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={initial?.isActive ?? true}
              className="accent-black w-4 h-4"
            />
            <span className="text-sm font-medium text-[#4A4A4A]">Activo</span>
          </label>
        </div>
      </div>

      <p role="status" aria-live="polite" className={`text-xs ${saveState === "error" ? "text-red-700" : saveState === "saved" ? "text-emerald-700" : "text-gray-500"}`}>
        {saveState === "saving" ? "Guardando cambios…" : saveState === "saved" ? "Guardado. Actualizando vista previa…" : saveState === "error" ? "No se guardaron los cambios." : "Los cambios se publican al guardar."}
      </p>
      <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-[#4A4A4A] hover:bg-gray-50 rounded-md transition-colors"
          disabled={isPending}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 text-sm font-semibold rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  )
}
