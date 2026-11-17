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
  const leftBtnRef = useRef<HTMLButtonElement>(null)
  const rightBtnRef = useRef<HTMLButtonElement>(null)
  const removeBtnRef = useRef<HTMLButtonElement>(null)
  const pendingFocusDirRef = useRef<-1 | 1 | null>(null)

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

  useEffect(() => {
    const dir = pendingFocusDirRef.current
    if (!dir) return
    pendingFocusDirRef.current = null

    if (dir === -1) {
      if (isFirstInGroup) {
        ;(isLastInGroup ? removeBtnRef.current : rightBtnRef.current)?.focus({ preventScroll: true })
      } else {
        leftBtnRef.current?.focus({ preventScroll: true })
      }
      return
    }

    if (isLastInGroup) {
      ;(isFirstInGroup ? removeBtnRef.current : leftBtnRef.current)?.focus({ preventScroll: true })
    } else {
      rightBtnRef.current?.focus({ preventScroll: true })
    }
  }, [index, isFirstInGroup, isLastInGroup])

  function handleMoveClick(dir: -1 | 1) {
    pendingFocusDirRef.current = dir
    onMove(dir)
  }

  return (
    <div
      ref={cardRef}
      className={`relative group w-[160px] rounded-lg border bg-white p-1.5 select-none transition-opacity duration-150 ${
        isDragSource ? "opacity-30" : ""
      } ${isDragTarget ? "border-[#E31C23] shadow-md" : "border-gray-200"}`}
    >
      {isDragTarget && (
        <span className="pointer-events-none absolute -left-2 top-0 bottom-0 w-0.5 rounded-full bg-[#E31C23] z-20" />
      )}

      {/* Área superior: miniatura + agarre libre para arrastrar sin que los botones lo tapen. */}
      <div className="relative h-24 w-full overflow-hidden rounded bg-gray-50/70">
        <div
          ref={handleRef}
          title="Arrastrar para reordenar"
          className="absolute top-1 left-1 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/55 cursor-grab active:cursor-grabbing opacity-80 group-hover:opacity-100 transition-opacity"
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
          className="h-full w-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-product.svg" }}
        />

        {isCover && (
          <span className="absolute top-1 right-1 z-10 bg-[#E31C23] text-white text-[10px] px-1.5 py-0.5 rounded leading-tight">
            Principal
          </span>
        )}
      </div>

      {/* Controles debajo de la foto: conservan ≥44px táctiles (.admin-shell) sin superponerse ni invadir vecinos. */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <button
          ref={leftBtnRef}
          type="button"
          onClick={() => handleMoveClick(-1)}
          disabled={isFirstInGroup}
          className="flex h-11 min-w-11 flex-1 items-center justify-center rounded border border-gray-200 text-sm text-[#1C1C1C] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Mover izquierda"
          aria-label="Mover foto a la izquierda"
        >←</button>
        <button
          ref={removeBtnRef}
          type="button"
          onClick={onRemove}
          className="flex h-11 min-w-11 flex-1 items-center justify-center rounded bg-[#E31C23] text-sm font-medium text-white hover:bg-[#c8171e]"
          title="Eliminar"
          aria-label="Eliminar foto"
        >×</button>
        <button
          ref={rightBtnRef}
          type="button"
          onClick={() => handleMoveClick(1)}
          disabled={isLastInGroup}
          className="flex h-11 min-w-11 flex-1 items-center justify-center rounded border border-gray-200 text-sm text-[#1C1C1C] hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Mover derecha"
          aria-label="Mover foto a la derecha"
        >→</button>
      </div>

      {/* Mover una foto a otro color la traslada de sección. */}
      <div className="mt-1.5 flex items-center gap-1.5 min-w-0">
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300"
          style={image.color ? getColorSwatchStyle(image.color) : { background: "#E5E5E5" }}
        />
        <select
          value={image.color ?? NO_COLOR}
          onChange={(e) => onColorChange(e.target.value === NO_COLOR ? null : e.target.value)}
          className={`min-w-0 flex-1 text-xs border rounded px-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#E31C23] ${
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

      <p className="text-[11px] text-[#4A4A4A] mt-1 truncate">
        {image.alt || "sin alt"}
      </p>
    </div>
  )
}
