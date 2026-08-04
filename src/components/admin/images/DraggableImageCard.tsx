"use client"

import { useEffect, useRef } from "react"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import { getColorSwatchStyle } from "@/lib/colors"
import { NO_COLOR, isImageDragData, type ImageRow } from "./types"

interface DraggableImageCardProps {
  image: ImageRow
  /** Posición dentro de la lista completa de imágenes; la usa el drag & drop. */
  index: number
  /** Etiqueta "Principal": la primera foto del producto, no la del grupo. */
  isCover: boolean
  isFirstInGroup: boolean
  isLastInGroup: boolean
  isDragSource: boolean
  isDragTarget: boolean
  availableColors: string[]
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onColorChange: (color: string | null) => void
  onDragEnter: (index: number) => void
  onDragLeave: () => void
}

export default function DraggableImageCard({
  image, index, isCover, isFirstInGroup, isLastInGroup, isDragSource, isDragTarget,
  availableColors, onRemove, onMove, onColorChange, onDragEnter, onDragLeave,
}: DraggableImageCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const handle = handleRef.current
    if (!card || !handle) return

    return combine(
      draggable({
        element: card,
        dragHandle: handle,
        getInitialData: (): Record<string, unknown> => ({ type: "image-card", index }),
      }),
      dropTargetForElements({
        element: card,
        canDrop: ({ source }) =>
          isImageDragData(source.data) && source.data.index !== index,
        getData: (): Record<string, unknown> => ({ type: "image-card", index }),
        onDragEnter: () => onDragEnter(index),
        onDragLeave: () => onDragLeave(),
      }),
    )
  }, [index, onDragEnter, onDragLeave])

  return (
    <div
      ref={cardRef}
      className={`relative group select-none transition-opacity duration-150 ${isDragSource ? "opacity-30" : ""}`}
    >
      {isDragTarget && (
        <span className="pointer-events-none absolute -left-1.5 top-0 bottom-0 w-0.5 rounded-full bg-[#E31C23] z-20" />
      )}

      <div
        ref={handleRef}
        title="Arrastrar para reordenar"
        className="absolute top-1 left-1 z-10 p-0.5 bg-black/50 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <circle cx="5"  cy="4"  r="1.2" />
          <circle cx="5"  cy="8"  r="1.2" />
          <circle cx="5"  cy="12" r="1.2" />
          <circle cx="11" cy="4"  r="1.2" />
          <circle cx="11" cy="8"  r="1.2" />
          <circle cx="11" cy="12" r="1.2" />
        </svg>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt}
        draggable={false}
        className={`w-20 h-20 object-cover rounded-lg border transition-all ${
          isDragTarget ? "border-[#E31C23] shadow-md" : "border-gray-200"
        }`}
        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg" }}
      />

      {isCover && (
        <span className="absolute top-1 right-1 bg-[#E31C23] text-white text-[10px] px-1 rounded leading-tight">
          Principal
        </span>
      )}

      <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={isFirstInGroup}
          className="text-white text-sm disabled:opacity-30"
          title="Mover izquierda"
        >←</button>
        <button
          type="button"
          onClick={onRemove}
          className="text-white text-sm bg-[#E31C23] rounded-full w-5 h-5 flex items-center justify-center"
          title="Eliminar"
        >×</button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={isLastInGroup}
          className="text-white text-sm disabled:opacity-30"
          title="Mover derecha"
        >→</button>
      </div>

      {/* Mover una foto a otro color la traslada de sección. */}
      <div className="mt-1 flex items-center gap-1">
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-full border border-gray-300"
          style={image.color ? getColorSwatchStyle(image.color) : { background: "#E5E5E5" }}
        />
        <select
          value={image.color ?? NO_COLOR}
          onChange={(e) => onColorChange(e.target.value === NO_COLOR ? null : e.target.value)}
          className={`w-[62px] text-[10px] border rounded px-1 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#E31C23] ${
            image.color ? "border-gray-200 text-[#1C1C1C]" : "border-amber-300 text-amber-700"
          }`}
          title="Mover esta foto a otro color"
          aria-label={`Color de la imagen ${index + 1}`}
        >
          {/* Solo como marcador de las fotos antiguas sin color: no se puede elegir. */}
          {!image.color && <option value={NO_COLOR} disabled>Sin color</option>}
          {availableColors.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="text-[10px] text-[#4A4A4A] mt-0.5 truncate max-w-[80px]">
        {image.alt || "sin alt"}
      </p>
    </div>
  )
}
