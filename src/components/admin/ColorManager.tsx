"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  createColorAction,
  updateColorAction,
  deleteColorAction,
} from "@/server/actions/product-color.actions"
import type { ProductColorDTO } from "@/server/services/product-color.service"

interface ColorManagerProps {
  colors: ProductColorDTO[]
}

const DEFAULT_HEX = "#1C1C1C"

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white " +
  "focus:outline-none focus:ring-2 focus:ring-[#E31C23] placeholder:text-gray-400"

export default function ColorManager({ colors }: ColorManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Alta
  const [newName, setNewName] = useState("")
  const [newHex, setNewHex] = useState(DEFAULT_HEX)

  // Edición en línea
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editHex, setEditHex] = useState(DEFAULT_HEX)

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        router.refresh()
        return
      }
      setError(result.error ?? "No se pudo completar la operación.")
    })
  }

  function handleCreate() {
    if (!newName.trim()) {
      setError("Escribe un nombre para el color.")
      return
    }
    const formData = new FormData()
    formData.set("name", newName)
    formData.set("hex", newHex)
    run(async () => {
      const result = await createColorAction(formData)
      if (result.success) {
        setNewName("")
        setNewHex(DEFAULT_HEX)
      }
      return result
    })
  }

  function startEdit(color: ProductColorDTO) {
    setEditingId(color.id)
    setEditName(color.name)
    setEditHex(color.hex)
    setError(null)
  }

  function handleSaveEdit(color: ProductColorDTO) {
    const formData = new FormData()
    formData.set("name", editName)
    formData.set("hex", editHex)
    formData.set("isActive", String(color.isActive))
    run(async () => {
      const result = await updateColorAction(color.id, formData)
      if (result.success) setEditingId(null)
      return result
    })
  }

  function handleToggleActive(color: ProductColorDTO) {
    const formData = new FormData()
    formData.set("name", color.name)
    formData.set("hex", color.hex)
    formData.set("isActive", String(!color.isActive))
    run(() => updateColorAction(color.id, formData))
  }

  function handleDelete(color: ProductColorDTO) {
    const used = color.usageCount ?? 0
    const message =
      used > 0
        ? `"${color.name}" se usa en ${used} variante(s). Si lo eliminas, esos productos conservarán el nombre del color pero se verán en gris hasta reasignarlos. ¿Continuar?`
        : `¿Eliminar el color "${color.name}"?`
    if (!window.confirm(message)) return
    run(() => deleteColorAction(color.id))
  }

  return (
    <div className="max-w-4xl p-6 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1C]">Colores de producto</h1>
        <p className="mt-1 text-sm text-gray-500">
          Esta paleta alimenta el selector de color de cada variante y los filtros de la tienda.
          Para un color combinado usa el formato <strong>Rojo/Negro</strong> al editar el producto.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#E31C23]">
          {error}
        </div>
      )}

      {/* Alta de color */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-bold text-[#1C1C1C]">
          Agregar color
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="new-color-name" className="mb-1 block text-sm font-medium text-[#1C1C1C]">
              Nombre
            </label>
            <input
              id="new-color-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. Verde Militar"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new-color-hex" className="mb-1 block text-sm font-medium text-[#1C1C1C]">
              Tono
            </label>
            <div className="flex items-center gap-2">
              <input
                id="new-color-hex"
                type="color"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-white p-1"
              />
              <input
                type="text"
                value={newHex}
                onChange={(e) => setNewHex(e.target.value)}
                className={`${inputClass} w-28 font-mono text-xs uppercase`}
                aria-label="Código hexadecimal"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={pending}
            className="rounded-lg bg-[#E31C23] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </section>

      {/* Listado */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Color</th>
              <th className="px-4 py-3 text-left font-medium">Tono</th>
              <th className="px-4 py-3 text-left font-medium">En uso</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {colors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Aún no hay colores en la paleta.
                </td>
              </tr>
            )}
            {colors.map((color) => {
              const isEditing = editingId === color.id
              return (
                <tr key={color.id} className={color.isActive ? "" : "bg-gray-50/60"}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 shrink-0 rounded-full ring-1 ring-gray-300"
                        style={{ backgroundColor: isEditing ? editHex : color.hex }}
                        aria-hidden
                      />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`${inputClass} text-sm`}
                        />
                      ) : (
                        <span className="font-medium text-[#1C1C1C]">{color.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={editHex}
                          onChange={(e) => setEditHex(e.target.value)}
                          className="h-8 w-12 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                          aria-label="Tono"
                        />
                        <input
                          type="text"
                          value={editHex}
                          onChange={(e) => setEditHex(e.target.value)}
                          className={`${inputClass} w-24 font-mono text-xs uppercase`}
                          aria-label="Código hexadecimal"
                        />
                      </div>
                    ) : (
                      <span className="font-mono text-xs uppercase text-gray-500">{color.hex}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {color.usageCount ? `${color.usageCount} variante(s)` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        color.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {color.isActive ? "Activo" : "Oculto"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2 text-xs font-medium">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(color)}
                            disabled={pending}
                            className="rounded-lg bg-[#1C1C1C] px-3 py-1.5 text-white transition-colors hover:bg-black disabled:opacity-60"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#1C1C1C] transition-colors hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(color)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#1C1C1C] transition-colors hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleActive(color)}
                            disabled={pending}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[#4A4A4A] transition-colors hover:bg-gray-50 disabled:opacity-60"
                          >
                            {color.isActive ? "Ocultar" : "Activar"}
                          </button>
                          <button
                            onClick={() => handleDelete(color)}
                            disabled={pending}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-[#E31C23] transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
