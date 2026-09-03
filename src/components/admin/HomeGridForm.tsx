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
  const [isPending, startTransition] = useTransition()

  async function actionHandler(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        const res = initial
          ? await updateGridBlock(initial.id, formData)
          : await createGridBlock(formData)

        if (res.success) {
          onClose()
        } else {
          setError(res.error || "Ocurrió un error inesperado.")
        }
      } catch {
        setError("No se pudo guardar el bloque. Intenta de nuevo.")
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
          defaultValue={initial?.href}
          required
          placeholder="Ej: /sale"
          className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="bgColor" className="block text-sm font-medium text-[#4A4A4A] mb-1">
            Color de Fondo *
          </label>
          <input
            id="bgColor"
            name="bgColor"
            type="text"
            defaultValue={initial?.bgColor || "bg-[#1C1C1C]"}
            required
            placeholder="Clase Tailwind o Hex"
            className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black"
          />
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
