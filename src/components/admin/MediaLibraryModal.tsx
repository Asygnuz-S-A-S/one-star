"use client"

import React, { useState, useEffect, useRef } from "react"
import { getMediaAssetsAction, deleteMediaAssetAction, syncMediaAssetsAction } from "@/server/actions/media-asset.actions"
import type { MediaAssetDTO } from "@/server/services/media-asset.service"

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (media: { url: string; fileName: string; fileType: string }) => void
  acceptedType?: "all" | "image" | "video"
  title?: string
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  acceptedType = "all",
  title = "Biblioteca de Medios",
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "upload">("browse")
  const [assets, setAssets] = useState<MediaAssetDTO[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>(acceptedType === "all" ? "all" : acceptedType)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetDTO | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadAssets = async (typeToFilter = filterType, searchQuery = search) => {
    setLoading(true)
    setError("")
    try {
      const res = await getMediaAssetsAction({
        fileType: typeToFilter === "all" ? undefined : typeToFilter,
        search: searchQuery,
        limit: 100,
      })
      if (res.success && res.data) {
        setAssets(res.data.items)
        setTotal(res.data.total)
      } else {
        setError(res.error || "No se pudieron cargar los archivos.")
      }
    } catch {
      setError("Error de conexión al cargar la biblioteca.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      setError("")
      getMediaAssetsAction({
        fileType: filterType === "all" ? undefined : filterType,
        search,
        limit: 100,
      })
        .then((res) => {
          if (isCancelled) return
          if (res.success && res.data) {
            setAssets(res.data.items)
            setTotal(res.data.total)
          } else {
            setError(res.error || "No se pudieron cargar los archivos.")
          }
        })
        .catch(() => {
          if (!isCancelled) setError("Error de conexión al cargar la biblioteca.")
        })
        .finally(() => {
          if (!isCancelled) setLoading(false)
        })
    }
    return () => {
      isCancelled = true
    }
  }, [isOpen, filterType, search])

  const handleSearchSubmit = (e: React.FormEvent) => {
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
      setUploadProgress("¡Subida completada!")
      setActiveTab("browse")
      await loadAssets(filterType, search)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error durante la subida.")
    } finally {
      setUploading(false)
      setUploadProgress("")
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar este archivo de la biblioteca? No se podrá recuperar.")) return
    setDeletingId(id)
    try {
      const res = await deleteMediaAssetAction(id)
      if (res.success) {
        setAssets((prev) => prev.filter((a) => a.id !== id))
        setTotal((prev) => Math.max(0, prev - 1))
        if (selectedAsset?.id === id) setSelectedAsset(null)
      } else {
        alert(res.error || "Error al eliminar el archivo")
      }
    } catch {
      alert("Error de red al eliminar el archivo")
    } finally {
      setDeletingId(null)
    }
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

  const handleConfirmSelect = (asset: MediaAssetDTO) => {
    onSelect({
      url: asset.url,
      fileName: asset.fileName,
      fileType: asset.fileType,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1C1C1C] text-white flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-[#1C1C1C] text-base">{title}</h3>
              <p className="text-xs text-gray-500">{total} archivos en total</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex bg-gray-200/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("browse")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  activeTab === "browse" ? "bg-white text-[#1C1C1C] shadow-sm" : "text-gray-600 hover:text-[#1C1C1C]"
                }`}
              >
                Explorar ({assets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 ${
                  activeTab === "upload" ? "bg-white text-[#1C1C1C] shadow-sm" : "text-gray-600 hover:text-[#1C1C1C]"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Subir Nuevo
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
              aria-label="Cerrar modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab 1: Explorar */}
        {activeTab === "browse" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Barra de Filtros y Búsqueda */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] max-w-md relative">
                <input
                  type="text"
                  placeholder="Buscar archivo por nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#1C1C1C] focus:bg-white"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </form>

              <div className="flex items-center gap-2">
                {acceptedType === "all" && (
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterType("all")}
                      className={`px-3 py-1.5 rounded-lg font-bold ${
                        filterType === "all" ? "bg-[#1C1C1C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType("image")}
                      className={`px-3 py-1.5 rounded-lg font-bold ${
                        filterType === "image" ? "bg-[#1C1C1C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Imágenes
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType("video")}
                      className={`px-3 py-1.5 rounded-lg font-bold ${
                        filterType === "video" ? "bg-[#1C1C1C] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Videos
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSync}
                  title="Sincronizar archivos existentes del catálogo"
                  className="p-2 text-gray-500 hover:text-[#1C1C1C] hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Grid de Archivos */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
              {loading && assets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-[#1C1C1C] rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold">Cargando biblioteca...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-[#1C1C1C] text-sm">No se encontraron archivos</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Sube imágenes o videos para comenzar a usarlos en marcas, carruseles o productos.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("upload")}
                    className="mt-4 px-4 py-2 bg-[#1C1C1C] text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors uppercase tracking-wider"
                  >
                    Subir Primer Archivo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {assets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id
                    const isVideo = asset.fileType === "video"

                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        onDoubleClick={() => handleConfirmSelect(asset)}
                        className={`group relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "ring-2 ring-[#1C1C1C] border-[#1C1C1C] shadow-md scale-[1.02]"
                            : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                        }`}
                      >
                        {/* Preview */}
                        <div className="aspect-square relative w-full bg-gray-100 overflow-hidden flex items-center justify-center">
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
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={asset.url}
                              alt={asset.fileName}
                              className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                            />
                          )}

                          {/* Badge de Tipo */}
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm">
                            {asset.fileType}
                          </span>

                          {/* Botón de Eliminar */}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(asset.id, e)}
                            disabled={deletingId === asset.id}
                            title="Eliminar archivo"
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        {/* Info Footer */}
                        <div className="p-2.5 bg-white border-t border-gray-100">
                          <p className="text-xs font-bold text-[#1C1C1C] truncate" title={asset.fileName}>
                            {asset.fileName}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                            {asset.folder && <span className="capitalize">{asset.folder}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer con selección */}
            <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between">
              <div className="text-xs text-gray-600 truncate max-w-md">
                {selectedAsset ? (
                  <span>
                    Seleccionado: <strong className="text-[#1C1C1C]">{selectedAsset.fileName}</strong>
                  </span>
                ) : (
                  <span>Haz clic en un archivo para seleccionarlo.</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!selectedAsset}
                  onClick={() => selectedAsset && handleConfirmSelect(selectedAsset)}
                  className="px-5 py-2 bg-[#1C1C1C] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Usar Archivo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Subir Archivo */}
        {activeTab === "upload" && (
          <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center bg-gray-50/50">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleFileUpload(e.dataTransfer.files)
              }}
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xl p-10 border-2 border-dashed border-gray-300 hover:border-[#1C1C1C] rounded-2xl bg-white text-center cursor-pointer transition-all duration-200 hover:shadow-lg flex flex-col items-center justify-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedType === "video" ? "video/*" : acceptedType === "image" ? "image/*" : "image/*,video/*"}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-[#1C1C1C] group-hover:text-white text-gray-500 flex items-center justify-center transition-colors mb-4 shadow-sm">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <h4 className="text-base font-bold text-[#1C1C1C]">
                Arrastra y suelta tus archivos aquí
              </h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                O haz clic para seleccionar imágenes (PNG, JPG, WebP, SVG) o videos (MP4, WebM) de hasta 30MB.
              </p>

              <button
                type="button"
                className="mt-6 px-5 py-2.5 bg-[#1C1C1C] text-white text-xs font-bold rounded-xl uppercase tracking-wider group-hover:bg-gray-800 transition-colors shadow-sm"
              >
                Seleccionar desde tu equipo
              </button>
            </div>

            {uploading && (
              <div className="mt-6 flex items-center gap-3 text-xs font-bold text-[#1C1C1C]">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#1C1C1C] rounded-full animate-spin" />
                <span>{uploadProgress || "Subiendo archivos..."}</span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium max-w-md text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
