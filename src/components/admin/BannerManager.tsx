"use client"

import React, { useState } from "react"
import { updateTopBannerAction } from "@/server/actions/top-banner.actions"

interface BannerData {
  text: string
  btnText: string
  btnUrl: string
  bgColor: string
  textColor: string
  isActive: boolean
}

export default function BannerManager({ initialData }: { initialData: BannerData }) {
  const [formData, setFormData] = useState<BannerData>(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const result = await updateTopBannerAction(formData)
    
    if (result.success) {
      setMessage({ type: "success", text: "Banner actualizado exitosamente." })
    } else {
      setMessage({ type: "error", text: result.error || "Error al actualizar." })
    }
    
    setIsSaving(false)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Previsualización */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Previsualización (En vivo)</label>
          <div className="border border-gray-300 rounded overflow-hidden">
            {formData.isActive ? (
              <div 
                className="text-[11px] tracking-wide text-center py-2 px-4 font-montserrat"
                style={{ backgroundColor: formData.bgColor, color: formData.textColor }}
              >
                {formData.text} &nbsp;·&nbsp;{" "}
                <span className="font-semibold uppercase hover:underline cursor-pointer" style={{ color: "#E31C23" }}>
                  {formData.btnText}
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic p-4 text-center bg-gray-50">
                El banner está inactivo y no se mostrará en la tienda.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-5 w-5 rounded border-gray-300 text-[#1C1C1C] focus:ring-[#1C1C1C]"
              />
              <span className="text-gray-900 font-medium">Banner Activo (Mostrar en la tienda)</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto Principal</label>
            <input
              type="text"
              name="text"
              value={formData.text}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto del Botón (ej. Ver SALE)</label>
            <input
              type="text"
              name="btnText"
              value={formData.btnText}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL del Botón (ej. /sale)</label>
            <input
              type="text"
              name="btnUrl"
              value={formData.btnUrl}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color de Fondo</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="bgColor"
                  value={formData.bgColor}
                  onChange={handleChange}
                  className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="bgColor"
                  value={formData.bgColor}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color del Texto</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="textColor"
                  value={formData.textColor}
                  onChange={handleChange}
                  className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="textColor"
                  value={formData.textColor}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-[#1C1C1C] text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 disabled:opacity-70 transition-colors"
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  )
}
