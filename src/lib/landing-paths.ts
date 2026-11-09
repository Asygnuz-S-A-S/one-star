/**
 * Las landings del constructor se publican en la raíz: /<slug>.
 * Las rutas fijas de la tienda siempre ganan, así que esos nombres no se pueden usar
 * (la prueba de este archivo falla si se agrega una carpeta nueva en src/app sin listarla aquí).
 */
export const RESERVED_LANDING_SLUGS = new Set([
  "accesorios", "admin", "api", "baja-publicidad", "buscar", "c", "cambios", "campanas", "carrito",
  "checkout", "club", "cookies", "crear-cuenta", "cuenta", "envios-y-devoluciones", "feed", "hombre",
  "lanzamientos", "login", "marcas", "mujer", "ninos", "pqrs", "privacidad", "productos", "r",
  "rastrear-pedido", "recuperar-contrasena", "registro", "restablecer-contrasena", "sale",
  "tarjeta-regalo", "terminos", "tiendas",
  // Archivos y carpetas públicas que también viven en la raíz.
  "brands", "logos", "plantillas", "size-guides", "robots-txt", "sitemap-xml",
])

export function isReservedLandingSlug(slug: string): boolean {
  return RESERVED_LANDING_SLUGS.has(slug)
}

/** URL pública de una landing: "home" es el inicio. */
export function landingPath(page: string): string {
  return page === "home" ? "/" : `/${page}`
}
