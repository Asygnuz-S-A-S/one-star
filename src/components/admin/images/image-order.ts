/**
 * Funciones puras para reordenar las imágenes de un producto manteniendo
 * la numeración secuencial de `position` y la agrupación por color.
 */

export interface OrderableImage {
  color: string | null
  position: number
}

/**
 * Mueve una imagen dentro de su grupo de color en la dirección indicada (-1 o 1),
 * intercambiándola con su vecina más cercana del mismo color para no sacarla
 * de su sección cuando las fotos de distintos colores están intercaladas.
 */
export function moveImageWithinColorGroup<T extends OrderableImage>(
  images: T[],
  index: number,
  dir: -1 | 1,
): T[] {
  const current = images[index]
  if (!current) return images

  let neighbor = -1
  for (let i = index + dir; i >= 0 && i < images.length; i += dir) {
    if (images[i].color === current.color) {
      neighbor = i
      break
    }
  }
  if (neighbor < 0) return images

  const next = [...images]
  ;[next[index], next[neighbor]] = [next[neighbor], next[index]]
  return next.map((img, i) => ({ ...img, position: i }))
}

/**
 * Reordena una imagen al soltarla sobre otra tarjeta (`to` es el índice de la
 * tarjeta destino antes de extraer `from`). Si el destino tiene otro color, la
 * imagen arrastrada adopta ese color.
 */
export function reorderImageOnCardDrop<T extends OrderableImage>(
  images: T[],
  from: number,
  to: number,
): T[] {
  if (
    from === to ||
    from < 0 ||
    from >= images.length ||
    to < 0 ||
    to >= images.length
  ) {
    return images
  }

  const targetColor = images[to]?.color ?? null
  const next = [...images]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, { ...moved, color: targetColor })
  return next.map((img, i) => ({ ...img, position: i }))
}

/**
 * Traslada una imagen al final de un grupo de color cuando se suelta sobre la
 * zona libre de ese panel.
 */
export function moveImageToColorPanelEnd<T extends OrderableImage>(
  images: T[],
  from: number,
  targetColor: string | null,
): T[] {
  const current = images[from]
  if (!current || current.color === targetColor) return images

  const next = [...images]
  const [moved] = next.splice(from, 1)
  next.push({ ...moved, color: targetColor })
  return next.map((img, i) => ({ ...img, position: i }))
}
