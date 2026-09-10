"use client"

import { useRef, useState } from "react"
import MediaLibraryModal from "@/components/admin/MediaLibraryModal"
import {
  ACCEPTED_PRODUCT_VIDEO_TYPES,
  MAX_PRODUCT_VIDEO_SECONDS,
  RECOMMENDED_PRODUCT_VIDEO_SECONDS,
  formatVideoDuration,
  getProductVideoRejection,
} from "@/lib/product-video"

interface ProductVideoFieldProps {
  value: string
  onChange: (url: string) => void
}

/** Lee la duración del archivo con un <video> temporal; `null` si el navegador no puede. */
function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const probe = document.createElement("video")
    probe.preload = "metadata"
    const finish = (duration: number | null) => {
      URL.revokeObjectURL(objectUrl)
      resolve(duration)
    }
    probe.onloadedmetadata = () =>
      finish(Number.isFinite(probe.duration) ? probe.duration : null)
    probe.onerror = () => finish(null)
    probe.src = objectUrl
  })
}

/**
 * Videoclip corto del producto (HU-4): subir archivo, elegir de la biblioteca
 * o pegar una URL directa. La ficha pública solo lo carga cuando el cliente
 * pulsa la miniatura de video, así que no afecta el tiempo de carga.
 */
export default function ProductVideoField({ value, onChange }: ProductVideoFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    const durationSeconds = await readVideoDuration(file)
    const rejection = getProductVideoRejection({
      type: file.type,
      size: file.size,
      durationSeconds,
    })
    if (rejection) {
      setError(rejection)
      return
    }

    setIsUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch("/api/upload", { method: "POST", body })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        setError(data.error ?? "No se pudo subir el video.")
        return
      }
      setDuration(durationSeconds)
      onChange(data.url)
    } catch {
      setError("Error de red al subir el video.")
    } finally {
      setIsUploading(false)
    }
  }

  function handleRemove() {
    onChange("")
    setDuration(null)
    setError(null)
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[#1C1C1C] mb-1">Video corto del producto</label>

      {value ? (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <video
            src={value}
            muted
            loop
            playsInline
            controls
            preload="metadata"
            className="h-24 w-24 shrink-0 rounded-md bg-black object-cover"
          />
          <div className="min-w-0 flex-1 text-xs text-[#4A4A4A]">
            <p className="truncate font-mono" title={value}>{value}</p>
            {duration !== null && <p className="mt-1">Duración: {formatVideoDuration(duration)}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-[#1C1C1C] hover:bg-gray-50 disabled:opacity-60"
              >
                Reemplazar
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="rounded-md px-3 py-1.5 font-semibold text-[#E31C23] hover:bg-red-50"
              >
                Quitar video
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-md bg-[#1C1C1C] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isUploading ? "Subiendo…" : "Subir video"}
          </button>
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            disabled={isUploading}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#1C1C1C] hover:bg-gray-100 disabled:opacity-60"
          >
            Elegir de biblioteca
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput((v) => !v)}
            className="text-xs text-[#4A4A4A] underline-offset-2 hover:underline"
          >
            o pegar una URL
          </button>
        </div>
      )}

      {showUrlInput && !value && (
        <input
          type="url"
          placeholder="https://…/video.mp4 (enlace directo al archivo)"
          onBlur={(e) => {
            const url = e.target.value.trim()
            if (url) onChange(url)
          }}
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_PRODUCT_VIDEO_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) void handleFile(file)
        }}
      />

      <p className="mt-1 text-xs text-[#4A4A4A]">
        Opcional. Recomendado: {RECOMMENDED_PRODUCT_VIDEO_SECONDS} segundos, sin audio, MP4.
        Máximo {MAX_PRODUCT_VIDEO_SECONDS} s y 20 MB. En la ficha aparece como una miniatura junto a las fotos.
      </p>
      {error && <p className="mt-1 text-xs text-[#E31C23]">{error}</p>}

      <MediaLibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        acceptedType="video"
        title="Elegir video del producto"
        onSelect={(media) => {
          setError(null)
          setDuration(null)
          onChange(media.url)
        }}
      />
    </div>
  )
}
