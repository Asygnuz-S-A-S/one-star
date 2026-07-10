"use client"

import React, { useState, useTransition } from "react"
import type { BrandDTO } from "@/server/services/brand.service"
import { createBrandAction, updateBrandAction, deleteBrandAction } from "@/app/admin/marcas/actions"

function slugify(text: string) {
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, "-")
}

export default function BrandManager({ brands: initialBrands }: { brands: BrandDTO[] }) {
  const [brands, setBrands] = useState(initialBrands)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const resetForm = () => {
    setName(""); setLogoUrl(""); setIsActive(true); setError("")
    setIsEditing(null); setIsAdding(false)
  }

  const startAdd = () => {
    resetForm(); setIsAdding(true)
  }

  const startEdit = (brand: BrandDTO) => {
    setIsEditing(brand.id)
    setName(brand.name)
    setLogoUrl(brand.logoUrl ?? "")
    setIsActive(brand.isActive)
    setIsAdding(false)
    setError("")
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) setLogoUrl(data.url)
      else setError(data.error ?? "Error al subir el logo")
    } catch {
      setError("Error de red al subir el logo")
    }
    setUploadingLogo(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("El nombre es requerido."); return }
    setError("")
    const fd = new FormData()
    fd.set("name", name.trim())
    fd.set("logoUrl", logoUrl.trim())
    fd.set("isActive", String(isActive))
    startTransition(async () => {
      const result = isEditing
        ? await updateBrandAction(isEditing, fd)
        : await createBrandAction(fd)
      if (!result.success) { setError(result.error ?? "Error"); return }
      // Refresh brands list
      const slug = slugify(name.trim())
      if (isEditing) {
        setBrands((prev) => prev.map((b) => b.id === isEditing
          ? { ...b, name: name.trim(), slug, logoUrl: logoUrl || null, isActive }
          : b
        ))
      } else {
        setBrands((prev) => [...prev, {
          id: result.id!,
          name: name.trim(),
          slug,
          logoUrl: logoUrl || null,
          isActive,
        }])
      }
      resetForm()
    })
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta marca? Los productos que la tengan quedarán sin marca.")) return
    startTransition(async () => {
      const result = await deleteBrandAction(id)
      if (!result.success) { setError(result.error ?? "Error"); return }
      setBrands((prev) => prev.filter((b) => b.id !== id))
    })
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#E31C23]"

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!isAdding && !isEditing && (
        <button
          onClick={startAdd}
          className="inline-flex items-center gap-2 bg-[#E31C23] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#c01018] transition-colors"
        >
          + Nueva Marca
        </button>
      )}

      {/* Form */}
      {(isAdding || isEditing) && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-[#1C1C1C] text-lg">
            {isEditing ? "Editar Marca" : "Nueva Marca"}
          </h2>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nike"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Logo</label>
            {logoUrl && (
              <div className="mb-2 flex items-center gap-3">
                <img src={logoUrl} alt="Logo" className="h-12 object-contain border rounded p-1" />
                <button type="button" onClick={() => setLogoUrl("")} className="text-xs text-red-500 hover:underline">
                  Quitar
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={uploadingLogo}
              className="text-sm text-[#4A4A4A] file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-[#1C1C1C] hover:file:bg-gray-200 cursor-pointer"
            />
            {uploadingLogo && <p className="text-xs text-gray-400 mt-1">Subiendo logo…</p>}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-[#1C1C1C]">Activa (visible en la tienda)</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#E31C23] text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-[#c01018] transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear marca"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-[#4A4A4A] hover:text-[#1C1C1C] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Brand list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {brands.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A] text-sm">
            No hay marcas aún. Agrega la primera marca.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Logo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">ID ERP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#4A4A4A] uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((brand) => (
                <tr key={brand.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="h-8 w-16 object-contain" />
                    ) : (
                      <div className="h-8 w-16 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-400">Sin logo</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#4A4A4A] font-mono text-xs truncate max-w-[150px]">{brand.erpId || "-"}</td>
                  <td className="px-4 py-3 font-medium text-[#1C1C1C]">{brand.name}</td>
                  <td className="px-4 py-3 text-[#4A4A4A] font-mono text-xs">{brand.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${brand.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {brand.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => startEdit(brand)}
                      className="text-xs text-[#1C1C1C] hover:text-[#E31C23] font-medium transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
