"use client"

import { useState, useTransition, useRef } from "react"
import Image from "next/image"
import { safePublicUrl } from "@/lib/safe-url"
import { toColombiaDateInput } from "@/lib/colombia-date"
import type { LandingBuilderActions } from "@/types/landing-builder-actions"

interface BannerData {
  id?: string
  title?: string
  imageUrl?: string
  mediaType?: string
  linkUrl?: string | null
  position?: number
  isActive?: boolean
  startDate?: string | null
  endDate?: string | null
}

interface Props {
  actions: Pick<LandingBuilderActions, "createBanner" | "updateBanner">
  initial?: BannerData
  onClose: () => void
}

type MediaSource = "upload" | "url"

export default function BannerForm({ actions, initial, onClose }: Props) {
  const { createBanner, updateBanner } = actions
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Media state
  const [mediaSource, setMediaSource] = useState<MediaSource>("upload")
  const [mediaUrl, setMediaUrl] = useState(initial?.imageUrl ?? "")
  const [mediaType, setMediaType] = useState<"image" | "video">(
    (initial?.mediaType as "image" | "video") ?? "image"
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)

    // Auto-detect type from file
    const isVideo = file.type.startsWith("video/")
    setMediaType(isVideo ? "video" : "image")

    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) {
        setMediaUrl(data.url)
      } else {
        setUploadError(data.error ?? "Error al subir el archivo")
      }
    } catch {
      setUploadError("Error de red al subir")
    }
    setUploading(false)
  }

  function detectTypeFromUrl(url: string) {
    const lower = url.toLowerCase()
    if (lower.match(/\.(mp4|webm|ogg|mov)(\?|$)/)) {
      setMediaType("video")
    } else {
      setMediaType("image")
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!mediaUrl.trim()) {
      setError("Debes subir un archivo o ingresar una URL.")
      return
    }
    const form = formRef.current
    if (!form) return
    const formData = new FormData(form)
    formData.set("isActive", String(isActive))
    formData.set("imageUrl", mediaUrl)
    formData.set("mediaType", mediaType)

    startTransition(async () => {
      try {
        const result = initial?.id
          ? await updateBanner(initial.id, formData)
          : await createBanner(formData)
        if (result.success) {
          onClose()
        } else {
          setError(result.error ?? "Error desconocido.")
        }
      } catch {
        setError("No se pudo guardar el banner. Intenta de nuevo.")
      }
    })
  }

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#1C1C1C] bg-white focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
  const labelClass = "block text-xs font-semibold text-[#4A4A4A] mb-1"
  const previewMediaUrl = safePublicUrl(mediaUrl, "")

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm px-4 py-2 rounded-lg bg-red-50 text-[#E31C23] border border-red-200">
          {error}
        </div>
      )}

      {/* Título */}
      <div>
        <label className={labelClass}>Título *</label>
        <input
          type="text"
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          className={inputClass}
          placeholder="Ej: Colección Verano 2025"
        />
      </div>

      {/* Media: imagen o video */}
      <div>
        <label className={labelClass}>Imagen o Video *</label>

        {/* Source tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-3">
          <button
            type="button"
            onClick={() => setMediaSource("upload")}
            className={`flex-1 py-2 text-xs font-bold transition-colors ${
              mediaSource === "upload"
                ? "bg-[#1C1C1C] text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            ↑ Subir archivo
          </button>
          <button
            type="button"
            onClick={() => setMediaSource("url")}
            className={`flex-1 py-2 text-xs font-bold border-l border-gray-200 transition-colors ${
              mediaSource === "url"
                ? "bg-[#1C1C1C] text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            🔗 Ingresar URL
          </button>
        </div>

        {mediaSource === "upload" ? (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#E31C23] hover:bg-red-50/30 transition-colors"
            >
              <p className="text-2xl mb-1">📁</p>
              <p className="text-sm font-medium text-gray-600">
                Haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Imágenes: JPG, PNG, WebP · Videos: MP4, WebM
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            {uploading && (
              <p className="text-xs text-gray-400 mt-2 text-center">Subiendo archivo…</p>
            )}
            {uploadError && (
              <p className="text-xs text-red-500 mt-2">{uploadError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={mediaUrl}
              onChange={(e) => {
                setMediaUrl(e.target.value)
                detectTypeFromUrl(e.target.value)
              }}
              placeholder="https://ejemplo.com/video.mp4 o imagen.jpg"
              className={inputClass}
            />
            {/* Type override */}
            <div className="flex gap-2">
              {(["image", "video"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMediaType(t)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded border transition-colors ${
                    mediaType === t
                      ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {t === "image" ? "🖼 Imagen" : "🎬 Video"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {previewMediaUrl && (
          <div className="mt-3 h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative">
            {mediaType === "video" ? (
              <video
                src={previewMediaUrl}
                className="w-full h-40 object-cover"
                muted
                autoPlay
                loop
                playsInline
              />
            ) : (
              <Image
                src={previewMediaUrl}
                alt="Preview"
                fill
                unoptimized
                className="object-cover"
              />
            )}
            <div className="absolute top-2 right-2 flex gap-1">
              <span className="bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {mediaType === "video" ? "🎬 Video" : "🖼 Imagen"}
              </span>
              <button
                type="button"
                onClick={() => { setMediaUrl(""); if (fileInputRef.current) fileInputRef.current.value = "" }}
                className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link URL */}
      <div>
        <label className={labelClass}>URL de destino (link)</label>
        <input
          type="text"
          name="linkUrl"
          defaultValue={initial?.linkUrl ?? ""}
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      {/* Posición */}
      <div>
        <label className={labelClass}>Posición (orden en el carrusel)</label>
        <input
          type="number"
          name="position"
          defaultValue={initial?.position ?? 0}
          min={0}
          className={inputClass}
        />
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fecha inicio (opcional)</label>
          <input
            type="date"
            name="startDate"
            defaultValue={toColombiaDateInput(initial?.startDate)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Fecha fin (opcional)</label>
          <input
            type="date"
            name="endDate"
            defaultValue={toColombiaDateInput(initial?.endDate)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Toggle activo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isActive ? "bg-[#E31C23]" : "bg-gray-300"
          }`}
          aria-label="Toggle activo"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm text-[#4A4A4A]">{isActive ? "Activo" : "Inactivo"}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="flex-1 bg-[#E31C23] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {isPending ? "Guardando…" : initial?.id ? "Actualizar banner" : "Crear banner"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 border border-gray-200 text-[#4A4A4A] text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
