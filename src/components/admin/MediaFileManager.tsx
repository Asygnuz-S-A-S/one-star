"use client"

import React, { useState, useEffect, useRef } from "react"
import { getMediaAssetsAction, deleteMediaAssetAction, syncMediaAssetsAction } from "@/server/actions/media-asset.actions"
import type { MediaAssetDTO } from "@/server/services/media-asset.service"

export default function MediaFileManager({ initialAssets }: { initialAssets: MediaAssetDTO[] }) {
  const [assets, setAssets] = useState<MediaAssetDTO[]>(initialAssets)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [error, setError] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetDTO | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadAssets = async (type = filterType, q = search) => {
    setLoading(true)
    setError("")
    try {
      const res = await getMediaAssetsAction({
        fileType: type === "all" ? undefined : type,
        search: q,
        limit: 150,
      })
      if (res.success && res.data) {
        setAssets(res.data.items)
      } else {
        setError(res.error || "Error al cargar los archivos.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadAssets(filterType, search)
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadProgress(`Subiendo ${files.length} archivo(s)...`)
    setError("")

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append("file", file)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: fd,
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `Error al subir ${file.name}`)
        }
      }
      await loadAssets(filterType, search)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al subir archivos.")
    } finally {
      setUploading(false)
      setUploadProgress("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este archivo de la biblioteca de medios?")) return
    try {
      const res = await deleteMediaAssetAction(id)
      if (res.success) {
        setAssets((prev) => prev.filter((a) => a.id !== id))
        if (selectedAsset?.id === id) setSelectedAsset(null)
      } else {
        alert(res.error || "Error al eliminar.")
      }
    } catch {
      alert("Error de red al eliminar el archivo.")
    }
  }

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSync = async () => {
    setLoading(true)
    try {
      const res = await syncMediaAssetsAction()
      if (res.success) {
        await loadAssets(filterType, search)
      }
    } finally {
      setLoading(false)
    }
  }

  const imageCount = assets.filter((a) => a.fileType === "image").length
  const videoCount = assets.filter((a) => a.fileType === "video").length

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-[#1C1C1C] uppercase tracking-tight font-[var(--font-barlow)]">
            Gestión de Archivos y Medios
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Administra, sube, explora y elimina imágenes o videos para marcas, banners y catálogo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={loading}
            title="Escanear y sincronizar archivos existentes"
            className="px-3.5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sincronizar
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 bg-[#E31C23] hover:bg-[#c01018] text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Subir Archivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Archivos</p>
            <p className="text-2xl font-black text-[#1C1C1C] mt-0.5">{assets.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Imágenes</p>
            <p className="text-2xl font-black text-blue-600 mt-0.5">{imageCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Videos</p>
            <p className="text-2xl font-black text-purple-600 mt-0.5">{videoCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Zona de Arrastre / Subida Rápida */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFileUpload(e.dataTransfer.files)
        }}
        onClick={() => fileInputRef.current?.click()}
        className="p-6 border-2 border-dashed border-gray-300 hover:border-[#1C1C1C] rounded-xl bg-gray-50/50 hover:bg-white text-center cursor-pointer transition-all flex flex-col items-center justify-center group"
      >
        <p className="text-xs font-bold text-gray-700 group-hover:text-[#1C1C1C]">
          Arrastra archivos aquí o haz clic para subir nuevas imágenes/videos
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">Soporta PNG, JPG, WebP, SVG, MP4, WebM (Máx. 30MB)</p>
      </div>

      {uploading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-xs font-bold text-blue-900">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-800 rounded-full animate-spin" />
          <span>{uploadProgress || "Subiendo archivos..."}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex-1 min-w-[260px] max-w-md relative">
          <input
            type="text"
            placeholder="Buscar por nombre de archivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1C1C1C] focus:bg-white"
          />
          <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => { setFilterType("all"); loadAssets("all", search) }}
            className={`px-3 py-1.5 rounded-lg font-bold ${
              filterType === "all" ? "bg-[#1C1C1C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos ({assets.length})
          </button>
          <button
            onClick={() => { setFilterType("image"); loadAssets("image", search) }}
            className={`px-3 py-1.5 rounded-lg font-bold ${
              filterType === "image" ? "bg-[#1C1C1C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Imágenes ({imageCount})
          </button>
          <button
            onClick={() => { setFilterType("video"); loadAssets("video", search) }}
            className={`px-3 py-1.5 rounded-lg font-bold ${
              filterType === "video" ? "bg-[#1C1C1C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Videos ({videoCount})
          </button>
        </div>
      </div>

      {/* Grid de Archivos */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
          <div className="w-8 h-8 border-3 border-gray-300 border-t-[#1C1C1C] rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold">Cargando archivos...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-bold text-[#1C1C1C] text-base">No hay archivos en la biblioteca</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Sube imágenes o pulsa &quot;Sincronizar&quot; para registrar los archivos ya existentes en la tienda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map((asset) => {
            const isVideo = asset.fileType === "video"
            const isCopied = copiedId === asset.id

            return (
              <div
                key={asset.id}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                {/* Visual Preview */}
                <div className="aspect-square relative w-full bg-gray-50 overflow-hidden flex items-center justify-center">
                  {isVideo ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-gray-900 text-white">
                      <video
                        src={asset.url}
                        muted
                        preload="metadata"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white backdrop-blur-sm">
                          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.fileName}
                      className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  )}

                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
                    {asset.fileType}
                  </span>

                  {/* Acciones flotantes */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(asset.url, asset.id)}
                      title="Copiar URL"
                      className="p-1.5 rounded-lg bg-white text-gray-700 hover:text-black shadow-sm transition-colors"
                    >
                      {isCopied ? (
                        <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(asset.id)}
                      title="Eliminar archivo"
                      className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-sm transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Info & Footer */}
                <div className="p-3 bg-white border-t border-gray-100 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#1C1C1C] truncate" title={asset.fileName}>
                      {asset.fileName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                      {asset.folder && <span className="capitalize">{asset.folder}</span>}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:underline truncate max-w-[110px]"
                    >
                      Ver original ↗
                    </a>
                    <button
                      onClick={() => copyToClipboard(asset.url, asset.id)}
                      className="text-[10px] font-bold text-gray-600 hover:text-black uppercase tracking-wider"
                    >
                      {isCopied ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
