"use client"

import { useState, useTransition } from "react"
import HomeGridForm from "./HomeGridForm"
import type { HomeGridBlock } from "@prisma/client"
import type { LandingBuilderActions } from "@/types/landing-builder-actions"

interface Props {
  actions: Pick<LandingBuilderActions, "createGridBlock" | "deleteGridBlock" | "toggleGridBlockActive" | "updateGridBlock">
  blocks: HomeGridBlock[]
  onRefresh?: () => void
}

export default function HomeGridClient({ actions, blocks, onRefresh }: Props) {
  const { deleteGridBlock, toggleGridBlockActive } = actions
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<HomeGridBlock | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este bloque?")) return
    startTransition(async () => {
      try {
        const result = await deleteGridBlock(id)
        if (!result.success) {
          alert(result.error || "No se pudo eliminar el bloque.")
          return
        }
        onRefresh?.()
      } catch {
        alert("No se pudo eliminar el bloque.")
      }
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      try {
        const result = await toggleGridBlockActive(id, current)
        if (!result.success) {
          alert(result.error || "No se pudo cambiar el estado.")
          return
        }
        onRefresh?.()
      } catch {
        alert("No se pudo cambiar el estado.")
      }
    })
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(block: HomeGridBlock) {
    setEditing(block)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-['Barlow',sans-serif] text-2xl font-bold text-[#1C1C1C]">
          Grilla de Inicio
          <span className="ml-2 text-sm font-normal text-[#4A4A4A]">({blocks.length})</span>
        </h1>
        <button
          onClick={openNew}
          className="bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          + Nuevo bloque
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="font-['Barlow',sans-serif] text-lg font-bold text-[#1C1C1C] mb-5">
              {editing ? "Editar bloque" : "Nuevo bloque"}
            </h2>
            <HomeGridForm
              actions={actions}
              initial={editing ?? undefined}
              onClose={() => {
                closeForm()
                onRefresh?.()
              }}
            />
          </div>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <p className="text-[#4A4A4A] text-lg mb-4">No hay bloques creados.</p>
          <button
            onClick={openNew}
            className="inline-block bg-[#E31C23] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Crear primer bloque
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Preview</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Label</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Enlace</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Posición</th>
                  <th className="text-left px-4 py-3 text-[#4A4A4A] font-semibold">Estado</th>
                  <th className="text-right px-4 py-3 text-[#4A4A4A] font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {blocks.map((block) => (
                  <tr key={block.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className={`w-20 h-11 rounded flex items-center justify-center ${block.bgColor.startsWith('bg-') ? block.bgColor : ''}`} style={!block.bgColor.startsWith('bg-') ? { backgroundColor: block.bgColor } : {}}>
                        <span className="text-xl">{block.emoji}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1C1C1C]">
                      {block.label}
                    </td>
                    <td className="px-4 py-3 text-[#4A4A4A]">
                      {block.href}
                    </td>
                    <td className="px-4 py-3 text-[#4A4A4A]">{block.position}</td>
                    <td className="px-4 py-3">
                      <button
                         onClick={() => handleToggle(block.id, block.isActive)}
                         disabled={isPending}
                         className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                           block.isActive
                             ? "bg-green-100 text-green-700 hover:bg-green-200"
                             : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                         }`}
                       >
                         {block.isActive ? "Activo" : "Inactivo"}
                       </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(block)}
                          className="text-xs font-medium text-[#E31C23] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(block.id)}
                          disabled={isPending}
                          className="text-xs font-medium text-gray-400 hover:text-red-600 hover:underline disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
