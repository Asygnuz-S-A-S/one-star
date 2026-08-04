"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { getColorSwatchStyle } from "@/lib/colors"
import DraggableImageCard from "./DraggableImageCard"
import { MIN_PRODUCT_IMAGES, isImageDragData, type ImageRow } from "./types"

/** Una foto junto a su posición en la lista completa (la que usa el drag & drop). */
interface IndexedImage {
  image: ImageRow
  index: number
}

/** Sección de la galería: las fotos de un color concreto. */
interface ImageGroup {
  /**
   * `null` solo en el grupo de fotos pendientes de asignar (heredadas de cuando
   * existían fotos generales). No se puede subir a ese grupo.
   */
  color: string | null
  label: string
  items: IndexedImage[]
  /** Un color que ya no está entre las variantes del producto. */
  isOrphan?: boolean
}

interface ProductImagesByColorProps {
  images: ImageRow[]
  /** Colores de las variantes sincronizadas; definen qué secciones existen. */
  variantColors: string[]
  /** Color cuyo panel está subiendo archivos, para mostrar el estado en su sitio. */
  uploadingColor: string | null
  uploadError: string | null
  isUploading: boolean
  onUpload: (files: FileList | null, color: string | null) => void
  onAddUrl: (url: string, alt: string, color: string | null) => void
  onRemove: (index: number) => void
  onColorChange: (index: number, color: string | null) => void
  /** Mueve la foto una posición dentro de su propia sección. */
  onMoveWithinGroup: (index: number, dir: -1 | 1) => void
  draggingIdx: number | null
  dragOverIdx: number | null
  onDragEnter: (index: number) => void
  onDragLeave: () => void
}

/** Clave estable para el panel general, que no tiene nombre de color. */
const GENERAL_KEY = "__general__"

export default function ProductImagesByColor({
  images, variantColors, uploadingColor, uploadError, isUploading,
  onUpload, onAddUrl, onRemove, onColorChange, onMoveWithinGroup,
  draggingIdx, dragOverIdx, onDragEnter, onDragLeave,
}: ProductImagesByColorProps) {
  /**
   * Una sección por color más la general. Se recorren las imágenes una sola vez
   * conservando su índice original: las tarjetas siguen operando sobre la lista
   * completa aunque se muestren separadas.
   */
  const groups = useMemo<ImageGroup[]>(() => {
    const byColor = new Map<string, IndexedImage[]>()
    const unassigned: IndexedImage[] = []

    images.forEach((image, index) => {
      if (!image.color) {
        unassigned.push({ image, index })
        return
      }
      const bucket = byColor.get(image.color)
      if (bucket) bucket.push({ image, index })
      else byColor.set(image.color, [{ image, index }])
    })

    const colorGroups: ImageGroup[] = variantColors.map((color) => ({
      color,
      label: color,
      items: byColor.get(color) ?? [],
    }))

    // Fotos etiquetadas con un color que ya no existe entre las variantes:
    // se muestran igual para que no queden invisibles y se puedan reasignar.
    const orphanGroups: ImageGroup[] = [...byColor.entries()]
      .filter(([color]) => !variantColors.includes(color))
      .map(([color, items]) => ({ color, label: `${color} (sin variante)`, items, isOrphan: true }))

    // El grupo sin color solo aparece si quedan fotos por reasignar: ya no se
    // pueden crear nuevas, pero las antiguas deben poder moverse a un color.
    const pendingGroup: ImageGroup[] = unassigned.length > 0
      ? [{ color: null, label: "Sin color asignado", items: unassigned }]
      : []

    return [...pendingGroup, ...colorGroups, ...orphanGroups]
  }, [images, variantColors])

  const colorsWithoutImages = groups
    .filter((group) => group.color && !group.isOrphan && group.items.length === 0)
    .map((group) => group.color as string)

  const unassignedCount = groups.find((group) => group.color === null)?.items.length ?? 0

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#4A4A4A]">
          Mínimo {MIN_PRODUCT_IMAGES} fotos en total · {images.length} cargada(s)
          {images.length < MIN_PRODUCT_IMAGES && (
            <span className="text-[#E31C23] ml-1">
              — faltan {MIN_PRODUCT_IMAGES - images.length}
            </span>
          )}
        </p>
        <p className="text-xs text-[#4A4A4A]">
          Arrastra una foto a otro color para moverla de sección.
        </p>
      </div>

      {variantColors.length === 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Este producto aún no tiene variantes con color, así que no hay dónde cargar fotos.
          Asigna colores en <strong>Variantes (Color × Talla)</strong> y aparecerá una sección
          por cada uno.
        </p>
      )}

      {unassignedCount > 0 && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Hay <strong>{unassignedCount}</strong> foto(s) sin color. Arrástralas al color que les
          corresponda —o cámbialo en el selector de cada tarjeta— porque ya no se publican fotos
          generales.
        </p>
      )}

      {colorsWithoutImages.length > 0 && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-[#E31C23]">
          Sin fotos propias: <strong>{colorsWithoutImages.join(", ")}</strong>. Mientras tanto se
          mostrarán las fotos generales.
        </p>
      )}

      {uploadError && <p className="text-[#E31C23] text-sm mb-4">{uploadError}</p>}

      <div className="space-y-4">
        {groups.map((group) => (
          <ColorImagePanel
            key={group.color ?? GENERAL_KEY}
            group={group}
            variantColors={variantColors}
            coverIndex={images.length > 0 ? 0 : -1}
            isUploadingHere={isUploading && uploadingColor === group.color}
            isUploading={isUploading}
            onUpload={onUpload}
            onAddUrl={onAddUrl}
            onRemove={onRemove}
            onColorChange={onColorChange}
            onMoveWithinGroup={onMoveWithinGroup}
            draggingIdx={draggingIdx}
            dragOverIdx={dragOverIdx}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
          />
        ))}
      </div>
    </>
  )
}

interface ColorImagePanelProps {
  group: ImageGroup
  variantColors: string[]
  coverIndex: number
  isUploadingHere: boolean
  isUploading: boolean
  onUpload: (files: FileList | null, color: string | null) => void
  onAddUrl: (url: string, alt: string, color: string | null) => void
  onRemove: (index: number) => void
  onColorChange: (index: number, color: string | null) => void
  onMoveWithinGroup: (index: number, dir: -1 | 1) => void
  draggingIdx: number | null
  dragOverIdx: number | null
  onDragEnter: (index: number) => void
  onDragLeave: () => void
}

function ColorImagePanel({
  group, variantColors, coverIndex, isUploadingHere, isUploading,
  onUpload, onAddUrl, onRemove, onColorChange, onMoveWithinGroup,
  draggingIdx, dragOverIdx, onDragEnter, onDragLeave,
}: ColorImagePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlValue, setUrlValue] = useState("")
  const [altValue, setAltValue] = useState("")
  const [isDropTarget, setIsDropTarget] = useState(false)

  const isEmpty = group.items.length === 0
  const needsPhotos = isEmpty && group.color !== null
  /** El grupo "sin color" no admite fotos nuevas: solo se vacía reasignándolas. */
  const acceptsPhotos = group.color !== null

  // Soltar una foto en cualquier punto del panel la reasigna a este color.
  useEffect(() => {
    const element = sectionRef.current
    if (!element || !acceptsPhotos || !group.color) return

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => isImageDragData(source.data),
      getData: (): Record<string, unknown> => ({ type: "color-panel", color: group.color }),
      onDragEnter: () => setIsDropTarget(true),
      onDragLeave: () => setIsDropTarget(false),
      onDrop: () => setIsDropTarget(false),
    })
  }, [acceptsPhotos, group.color])

  function submitUrl() {
    if (!urlValue.trim()) return
    onAddUrl(urlValue.trim(), altValue.trim(), group.color)
    setUrlValue("")
    setAltValue("")
    setShowUrlInput(false)
  }

  return (
    <section
      ref={sectionRef}
      className={`rounded-xl border p-4 transition-colors ${
        isDropTarget
          ? "border-[#E31C23] bg-red-50/60 ring-2 ring-[#E31C23]/30"
          : needsPhotos
            ? "border-red-200 bg-red-50/40"
            : group.color === null
              ? "border-amber-200 bg-amber-50/40"
              : "border-gray-200 bg-white"
      }`}
      aria-label={`Fotos del color ${group.label}`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 rounded-full border border-gray-300"
          style={group.color ? getColorSwatchStyle(group.color) : { background: "#E5E5E5" }}
        />
        <h3 className="text-sm font-bold text-[#1C1C1C]">{group.label}</h3>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            needsPhotos
              ? "border-red-200 bg-white text-[#E31C23]"
              : "border-gray-200 bg-gray-50 text-[#4A4A4A]"
          }`}
        >
          {group.items.length} {group.items.length === 1 ? "foto" : "fotos"}
        </span>
        {needsPhotos && (
          <span className="text-[11px] text-[#E31C23]">Este color aún no tiene fotos</span>
        )}
        {group.color === null && (
          <span className="text-[11px] text-amber-700">Muévelas a un color</span>
        )}
      </header>

      {acceptsPhotos && (
        <div
          className={`mb-3 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
            isUploading
              ? "cursor-wait border-gray-300 bg-gray-50"
              : "border-gray-200 hover:border-[#E31C23]"
          }`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            if (!isUploading) onUpload(e.dataTransfer.files, group.color)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files, group.color)
              e.target.value = ""
            }}
          />
          {isUploadingHere ? (
            <p className="animate-pulse text-sm text-[#4A4A4A]">Subiendo imágenes…</p>
          ) : (
            <>
              <p className="text-sm text-[#4A4A4A]">
                <span className="font-semibold">Arrastra o haz click</span> para añadir fotos
                <span className="text-[#1C1C1C] font-semibold"> de {group.color}</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP · máx 10 MB por imagen</p>
            </>
          )}
        </div>
      )}

      {group.items.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-4">
          {group.items.map(({ image, index }, positionInGroup) => (
            <DraggableImageCard
              key={image.id ?? image.url}
              image={image}
              index={index}
              isCover={index === coverIndex}
              isFirstInGroup={positionInGroup === 0}
              isLastInGroup={positionInGroup === group.items.length - 1}
              isDragSource={draggingIdx === index}
              isDragTarget={dragOverIdx === index && draggingIdx !== index}
              availableColors={variantColors}
              onRemove={() => onRemove(index)}
              onMove={(dir) => onMoveWithinGroup(index, dir)}
              onColorChange={(color) => onColorChange(index, color)}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
            />
          ))}
        </div>
      )}

      {!acceptsPhotos ? null : showUrlInput ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="URL de imagen (https://…)"
            className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
          />
          <input
            type="text"
            value={altValue}
            onChange={(e) => setAltValue(e.target.value)}
            placeholder="Texto alternativo"
            className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31C23]"
          />
          <button
            type="button"
            onClick={submitUrl}
            className="whitespace-nowrap rounded-lg bg-[#1C1C1C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4A4A4A]"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="rounded-lg px-3 py-2 text-sm text-[#4A4A4A] hover:text-[#1C1C1C]"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="text-xs font-semibold text-[#4A4A4A] underline-offset-2 hover:text-[#1C1C1C] hover:underline"
        >
          o agregar por URL
        </button>
      )}
    </section>
  )
}
