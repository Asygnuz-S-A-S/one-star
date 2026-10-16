/**
 * Reglas del videoclip corto de producto (HU-4).
 *
 * El objetivo es un clip de pocos segundos que muestre el producto en
 * movimiento sin castigar la carga de la ficha: por eso se limita duración y
 * peso antes de subirlo a Cloudinary.
 */

/** Duración sugerida al operador, en segundos. */
export const RECOMMENDED_PRODUCT_VIDEO_SECONDS = 3

/** Tope de duración aceptado, en segundos. */
export const MAX_PRODUCT_VIDEO_SECONDS = 15

/** Tope de peso aceptado, en bytes (el endpoint de subida admite hasta 30 MB). */
export const MAX_PRODUCT_VIDEO_BYTES = 20 * 1024 * 1024

/** Formatos que reproducen bien en navegadores móviles y de escritorio. */
export const ACCEPTED_PRODUCT_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const

export interface ProductVideoCandidate {
  type: string
  size: number
  /** Duración leída de los metadatos; `null` si el navegador no pudo leerla. */
  durationSeconds: number | null
}

/**
 * Devuelve el motivo por el que un archivo no sirve como video de producto,
 * o `null` si es válido. Es puro para poder probarlo sin navegador.
 */
export function getProductVideoRejection(candidate: ProductVideoCandidate): string | null {
  if (!candidate.type.startsWith("video/")) {
    return "El archivo debe ser un video."
  }
  if (!(ACCEPTED_PRODUCT_VIDEO_TYPES as readonly string[]).includes(candidate.type)) {
    return "Formato no compatible. Usa MP4, WebM o MOV."
  }
  if (candidate.size > MAX_PRODUCT_VIDEO_BYTES) {
    const maxMb = Math.round(MAX_PRODUCT_VIDEO_BYTES / (1024 * 1024))
    return `El video no puede pesar más de ${maxMb} MB.`
  }
  if (candidate.durationSeconds !== null && candidate.durationSeconds > MAX_PRODUCT_VIDEO_SECONDS) {
    return `El video no puede durar más de ${MAX_PRODUCT_VIDEO_SECONDS} segundos (recomendado: ${RECOMMENDED_PRODUCT_VIDEO_SECONDS}).`
  }
  return null
}

/** Formatea segundos como "3 s" o "12,5 s" para mostrarlos en el admin. */
export function formatVideoDuration(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10
  return `${rounded.toLocaleString("es-CO")} s`
}
