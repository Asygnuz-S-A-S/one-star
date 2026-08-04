/** Tipos compartidos por los componentes de imágenes del formulario de producto. */

export interface ImageRow {
  id?: string
  url: string
  alt: string
  position: number
  /** Color de variante al que pertenece la foto. null = imagen general del producto. */
  color: string | null
}

/** Valor del selector que representa "imagen general, sin color asignado". */
export const NO_COLOR = "__general__"

/** Mínimo de fotos que exige el formulario antes de permitir guardar. */
export const MIN_PRODUCT_IMAGES = 5

export interface ImageDragData {
  type: "image-card"
  index: number
  [key: string]: unknown
}

export function isImageDragData(data: Record<string, unknown>): data is ImageDragData {
  return data.type === "image-card" && typeof data.index === "number"
}

/** Soltar sobre el panel de un color reasigna la foto a ese color. */
export interface ColorPanelDropData {
  type: "color-panel"
  color: string
  [key: string]: unknown
}

export function isColorPanelDropData(data: Record<string, unknown>): data is ColorPanelDropData {
  return data.type === "color-panel" && typeof data.color === "string"
}
