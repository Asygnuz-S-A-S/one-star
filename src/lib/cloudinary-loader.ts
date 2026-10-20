export interface CloudinaryLoaderParams {
  src: string
  width: number
  quality?: number
}

/**
 * Custom loader para Next.js Image que delega la optimización directamente a Cloudinary.
 *
 * Para URLs de res.cloudinary.com, inyecta las transformaciones f_auto,q_auto,w_{width}
 * en el segmento /image/upload/, evitando que el VPS de producción consuma CPU/RAM
 * optimizando imágenes a través de /_next/image.
 *
 * Para cualquier otra URL (rutas locales como /placeholder-product.svg, Unsplash, etc.),
 * devuelve la URL intacta sin transformaciones.
 */
export default function cloudinaryLoader({
  src,
  width,
}: CloudinaryLoaderParams): string {
  if (typeof src !== "string" || !src.includes("res.cloudinary.com") || !src.includes("/image/upload/")) {
    return src
  }

  // Si ya tiene una transformación w_\d previa, la reemplaza; si no, la inserta justo tras /image/upload/
  return src.replace(
    /\/image\/upload\/(?:f_auto,q_auto,w_\d+\/)?/,
    `/image/upload/f_auto,q_auto,w_${width}/`
  )
}
