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
  // Los efectos (e_…) van primero: quitar fondo y recortar antes de escalar deja el producto nítido.
  return src.replace(
    /\/image\/upload\/((?:e_[^/]+\/)*)(?:f_auto,q_auto,w_\d+\/)?/,
    `/image/upload/$1f_auto,q_auto,w_${width}/`
  )
}

/**
 * Producto recortado y sin fondo (complemento de quitar fondo de Cloudinary + recorte al borde),
 * para mostrarlo grande sobre cualquier color. URLs que no son de Cloudinary se devuelven igual.
 * Cloudinary procesa cada foto la primera vez y mientras tanto responde 423: quien la use debe
 * tener una imagen de respaldo (ver ProductCutoutImage).
 */
export function productCutoutUrl(src: string): string {
  if (!src.includes("res.cloudinary.com") || !src.includes("/image/upload/") || src.includes("e_background_removal")) return src
  return src.replace("/image/upload/", "/image/upload/e_background_removal/e_trim/")
}

/** La foto original de una URL sin fondo (respaldo mientras Cloudinary procesa ese tamaño). */
export function withoutCutout(src: string): string {
  return src.replace("/image/upload/e_background_removal/e_trim/", "/image/upload/")
}
