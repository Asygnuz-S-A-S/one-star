const VIDEO_UPLOAD = "/video/upload/"

/**
 * Versión "escenario" de un video de producto en Cloudinary: recorta el aire alrededor del
 * tenis (los videos de la guía son cuadrados con el producto al centro, ocupando ~55% del
 * ancho) y genera la carátula desde el mismo video para que no salte al empezar.
 * Para videos fuera de Cloudinary devuelve la URL tal cual y sin carátula propia.
 */
export function stageVideoSources(url: string): { src: string; poster: string | null } {
  if (!url.includes("res.cloudinary.com") || !url.includes(VIDEO_UPLOAD)) return { src: url, poster: null }

  const crop = "c_crop,g_center,w_0.72,h_0.6/w_1280,q_auto"
  const src = url.replace(VIDEO_UPLOAD, `${VIDEO_UPLOAD}${crop}/`)
  const poster = url.replace(VIDEO_UPLOAD, `${VIDEO_UPLOAD}${crop},so_0/`).replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, ".jpg")
  return { src, poster }
}
