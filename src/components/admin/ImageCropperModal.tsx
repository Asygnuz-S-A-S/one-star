"use client"

import React, { useState, useCallback } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { getCroppedImg } from "@/utils/cropImage"

interface ImageCropperModalProps {
  imageSrc: string
  onClose: () => void
  onCropComplete: (croppedBlob: Blob) => void
}

export default function ImageCropperModal({ imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onCropComplete(croppedBlob)
    } catch (e) {
      console.error(e)
      alert("Error al recortar la imagen")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Recortar Logo</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative w-full h-[50vh] bg-gray-100">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={undefined} // Libre por defecto
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
            classes={{ containerClassName: "h-full w-full" }}
          />
        </div>
        
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="mb-6 flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#1C1C1C] text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {isProcessing ? "Procesando..." : "Confirmar Recorte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
