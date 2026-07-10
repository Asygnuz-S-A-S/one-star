"use client"

import React, { useState, useRef } from "react"
import Image from "next/image"
import { StoreLogo } from "@prisma/client"
import { 
  addStoreLogoAction, 
  setPrimaryStoreLogoAction, 
  deleteStoreLogoAction,
  updateStoreLogoThemeAction
} from "@/server/actions/site-logo.actions"
import ImageCropperModal from "./ImageCropperModal"

export default function LogoManager({ initialLogos }: { initialLogos: StoreLogo[] }) {
  const [logos, setLogos] = useState<StoreLogo[]>(initialLogos)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropType, setCropType] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState<string>("")
  
  const desktopLogos = logos.filter(l => l.type === "desktop")
  const mobileLogos = logos.filter(l => l.type === "mobile")
  const largeLogos = logos.filter(l => l.type === "large")

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setOriginalFileName(file.name)
    setCropType(type)

    const reader = new FileReader()
    reader.addEventListener("load", () => {
      setCropImageSrc(reader.result?.toString() || null)
    })
    reader.readAsDataURL(file)

    // Reset input so the same file can be selected again
    e.target.value = ""
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!cropType) return
    
    setCropImageSrc(null) // Cierra el modal
    setIsUploading(true)
    
    const fd = new FormData()
    // Creamos un File a partir del Blob para preservar el nombre original
    const fileToUpload = new File([croppedBlob], originalFileName, { type: croppedBlob.type || 'image/png' })
    fd.append("file", fileToUpload)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      
      if (!res.ok) {
        alert(data.error || "Error al subir imagen")
        return
      }

      const isFirstOfType = logos.filter(l => l.type === cropType).length === 0

      const result = await addStoreLogoAction({
        url: data.url,
        fileName: originalFileName,
        type: cropType,
        theme: "light",
        isPrimary: isFirstOfType
      })

      if (result.success && result.data) {
        setLogos(prev => [result.data as StoreLogo, ...prev])
      }
    } catch (error) {
      alert("Error de red al subir imagen")
    } finally {
      setIsUploading(false)
      setCropType(null)
      setOriginalFileName("")
    }
  }

  const handleSetPrimary = async (id: string, type: string) => {
    const res = await setPrimaryStoreLogoAction(id, type)
    if (res.success) {
      setLogos(prev => prev.map(l => {
        if (l.type === type) {
          return { ...l, isPrimary: l.id === id }
        }
        return l
      }))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este logo?")) return
    const res = await deleteStoreLogoAction(id)
    if (res.success) {
      setLogos(prev => prev.filter(l => l.id !== id))
    }
  }

  const handleThemeChange = async (id: string, theme: string) => {
    const res = await updateStoreLogoThemeAction(id, theme)
    if (res.success) {
      setLogos(prev => prev.map(l => l.id === id ? { ...l, theme } : l))
    }
  }

  const renderLogoGallery = (type: string, title: string, items: StoreLogo[]) => {
    return (
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              id={`upload-${type}`}
              onChange={(e) => handleFileSelect(e, type)}
            />
            <label 
              htmlFor={`upload-${type}`}
              className="cursor-pointer bg-[#1C1C1C] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {isUploading ? "Subiendo..." : "Subir Logo"}
            </label>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
            No hay logos subidos en esta categoría. Sube uno para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(logo => (
              <div 
                key={logo.id} 
                className={`border rounded-lg overflow-hidden flex flex-col ${logo.isPrimary ? 'ring-2 ring-[#E31C23] border-transparent' : 'border-gray-200'}`}
              >
                {/* Image display background changes based on theme */}
                <div className={`p-6 flex justify-center items-center h-32 relative ${logo.theme === 'dark' ? 'bg-[#1C1C1C]' : 'bg-gray-100'}`}>
                  {logo.isPrimary && (
                    <span className="absolute top-2 left-2 bg-[#E31C23] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                      Principal
                    </span>
                  )}
                  <div className={`relative ${type === 'mobile' ? 'w-[80px] h-[57px]' : 'w-[100px] h-[71px]'}`}>
                    <Image src={logo.url} alt="Logo" fill className="object-contain" unoptimized />
                  </div>
                </div>
                
                <div className="p-4 bg-white flex flex-col gap-3 flex-1">
                  <div className="text-xs text-gray-500 truncate" title={logo.fileName || logo.url}>
                    {logo.fileName || "Logo sin nombre"}
                  </div>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <select 
                      value={logo.theme} 
                      onChange={(e) => handleThemeChange(logo.id, e.target.value)}
                      className="text-xs border-gray-300 rounded-md py-1 px-2 focus:ring-[#1C1C1C] focus:border-[#1C1C1C]"
                    >
                      <option value="light">Fondo Claro</option>
                      <option value="dark">Fondo Oscuro</option>
                      <option value="any">Cualquier Fondo</option>
                    </select>
                    
                    <div className="flex gap-2">
                      {!logo.isPrimary && (
                        <button 
                          onClick={() => handleSetPrimary(logo.id, type)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          Hacer Principal
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(logo.id)}
                        className="text-xs font-medium text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {renderLogoGallery("mobile", "Logos Móviles (Aprox 80x57px)", mobileLogos)}
      {renderLogoGallery("desktop", "Logos Escritorio (Aprox 100x71px)", desktopLogos)}
      {renderLogoGallery("large", "Logos Grandes / Footer (Opcional)", largeLogos)}

      {cropImageSrc && (
        <ImageCropperModal
          imageSrc={cropImageSrc}
          onClose={() => {
            setCropImageSrc(null)
            setCropType(null)
            setOriginalFileName("")
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  )
}
