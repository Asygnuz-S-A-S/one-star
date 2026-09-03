/**
 * Resolución de imágenes de producto.
 *
 * Dos responsabilidades:
 * 1. Garantizar que SIEMPRE haya una imagen que renderizar (placeholder por defecto).
 * 2. Filtrar la galería por el color de variante seleccionado.
 */

/** Imagen mostrada cuando un producto no tiene fotos cargadas. */
export const PLACEHOLDER_IMAGE_URL = "/placeholder-product.svg"

export interface ProductImageLike {
  url: string
  alt?: string | null
  /** Color de variante al que pertenece la foto. `null` = imagen general. */
  color?: string | null
}

/** Normaliza un color para comparar sin distinguir mayúsculas ni acentos. */
export function normalizeColor(color: string): string {
  return color
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/**
 * URL de la primera imagen del producto, o el placeholder si no tiene ninguna.
 * Úsalo en tarjetas, carrito, pedidos y cualquier miniatura.
 */
export function getPrimaryImageUrl(
  images: readonly ProductImageLike[] | null | undefined
): string {
  return images?.[0]?.url || PLACEHOLDER_IMAGE_URL
}

/**
 * Imágenes que corresponden al color seleccionado.
 *
 * Reglas:
 * - Sin color seleccionado → todas las imágenes.
 * - Con color → las de ese color más las generales (`color === null`).
 * - Si ninguna imagen tiene color asignado → todas (producto sin fotos por color).
 */
export function filterImagesByColor<T extends ProductImageLike>(
  images: readonly T[],
  selectedColor: string | null | undefined
): T[] {
  if (!selectedColor) return [...images]

  const hasColorTagged = images.some((img) => Boolean(img.color))
  if (!hasColorTagged) return [...images]

  const target = normalizeColor(selectedColor)
  const matching = images.filter(
    (img) => img.color && normalizeColor(img.color) === target
  )

  // Sin fotos para ese color: mostrar la galería completa en vez de dejarla vacía.
  if (matching.length === 0) return [...images]

  const general = images.filter((img) => !img.color)
  return [...matching, ...general]
}
