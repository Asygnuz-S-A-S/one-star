"use client"

import React, { useState } from "react"
import type { Category } from "@prisma/client"
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "@/server/actions/category.actions"

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const categories = initialCategories
  const [isEditing, setIsEditing] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const generateSlug = (text: string) => {
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-")
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (!isEditing) {
      setSlug(generateSlug(e.target.value))
    }
  }

  const startEdit = (cat: Category) => {
    setIsEditing(cat.id)
    setName(cat.name)
    setSlug(cat.slug)
    setError("")
  }

  const cancelEdit = () => {
    setIsEditing(null)
    setName("")
    setSlug("")
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    let result
    if (isEditing) {
      result = await updateCategoryAction(isEditing, name, slug)
    } else {
      result = await createCategoryAction(name, slug)
    }

    if (result.success) {
      // Reload page effectively or update local state
      // Next.js Server Actions with revalidatePath usually refresh the page content
      window.location.reload()
    } else {
      setError(result.error || "Ocurrió un error")
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta categoría? Si tiene productos, no se podrá borrar.")) return
    
    setIsSaving(true)
    const result = await deleteCategoryAction(id)
    if (result.success) {
      window.location.reload()
    } else {
      alert(result.error)
      setIsSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="bg-white p-6 border border-[#E0E0E0] shadow-sm rounded-md h-fit">
        <h2 className="font-[var(--font-barlow)] font-bold text-xl mb-4">
          {isEditing ? "Editar Categoría" : "Nueva Categoría"}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 mb-4 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre</label>
            <input
              required
              type="text"
              value={name}
              onChange={handleNameChange}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Ej. Zapatos Rojos"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Slug (URL)</label>
            <div className="flex items-center">
              <span className="bg-gray-100 p-2 border border-r-0 border-gray-300 rounded-l text-gray-500 text-sm">/c/</span>
              <input
                required
                type="text"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-r"
                placeholder="zapatos-rojos"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isSaving || !name || !slug}
              className="flex-1 bg-[#1C1C1C] text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="md:col-span-2">
        <div className="bg-white border border-[#E0E0E0] shadow-sm rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-[#E0E0E0]">
                <th className="p-4 font-[var(--font-barlow)] font-bold text-[#1C1C1C]">Nombre</th>
                <th className="p-4 font-[var(--font-barlow)] font-bold text-[#1C1C1C]">URL (Slug)</th>
                <th className="p-4 font-[var(--font-barlow)] font-bold text-[#1C1C1C] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    No hay categorías creadas.
                  </td>
                </tr>
              )}
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{cat.name}</td>
                  <td className="p-4 text-gray-500 font-mono text-sm">/c/{cat.slug}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => startEdit(cat)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
