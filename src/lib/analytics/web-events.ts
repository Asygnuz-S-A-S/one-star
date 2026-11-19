/**
 * Clasificador de eventos de la analítica propia. Es código puro (sin acceso a
 * red ni a base) para que lo usen igual el cliente y el servidor, y para poder
 * probarlo sin montar nada.
 *
 * El navegador solo manda la ruta y su query string: el TIPO lo decide el
 * servidor con estas reglas. Así, cambiar la clasificación no obliga a tocar
 * cada página ni a esperar a que los navegadores recarguen el bundle viejo.
 */

export type WebEventKind =
  | "PAGE_VIEW"
  | "CATEGORY_VIEW"
  | "PRODUCT_VIEW"
  | "SEARCH"
  | "FILTER_APPLY"
  | "ADD_TO_CART"
  | "CHECKOUT_START"
  | "PURCHASE"

export interface ClassifiedWebEvent {
  type: WebEventKind
  categorySlug: string | null
  productSlug: string | null
  brandSlug: string | null
  searchTerm: string | null
  filters: Record<string, string> | null
}

/** Claves de filtro del catálogo (ver `src/app/productos/page.tsx`). */
export const FILTER_KEYS = [
  "marca",
  "talla",
  "color",
  "precio_min",
  "precio_max",
  "orden",
  "genero",
  "categoria",
] as const

/** Rutas que listan catálogo: ahí aplican filtros y búsqueda. */
const CATALOG_PATHS = new Set([
  "/productos",
  "/hombre",
  "/mujer",
  "/ninos",
  "/accesorios",
  "/lanzamientos",
  "/buscar",
  "/marcas",
])

export const MAX_PATH_LENGTH = 500
export const MAX_TERM_LENGTH = 200
export const MAX_FILTER_VALUE_LENGTH = 120

function clean(value: string | null | undefined, max: number): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, max)
}

/** Normaliza la ruta: sin query, sin barra final, siempre con barra inicial. */
export function normalizePath(rawPath: string): string {
  const withoutQuery = rawPath.split("?")[0].split("#")[0]
  const withSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`
  const withoutTrailing = withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash
  return withoutTrailing.slice(0, MAX_PATH_LENGTH) || "/"
}

function segments(path: string): string[] {
  return path.split("/").filter((part) => part.length > 0)
}

function extractFilters(params: URLSearchParams): Record<string, string> | null {
  const filters: Record<string, string> = {}
  for (const key of FILTER_KEYS) {
    const value = clean(params.get(key), MAX_FILTER_VALUE_LENGTH)
    if (value) filters[key] = value
  }
  return Object.keys(filters).length > 0 ? filters : null
}

function isCatalogPath(path: string): boolean {
  if (CATALOG_PATHS.has(path)) return true
  // /marcas/<slug> y /categoria/<slug> también listan catálogo
  const [first] = segments(path)
  return first === "marcas" || first === "categoria"
}

export function classifyWebEvent(rawPath: string, rawQuery = ""): ClassifiedWebEvent {
  const path = normalizePath(rawPath)
  const params = new URLSearchParams(rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery)
  const parts = segments(path)

  const base: ClassifiedWebEvent = {
    type: "PAGE_VIEW",
    categorySlug: null,
    productSlug: null,
    brandSlug: null,
    searchTerm: null,
    filters: null,
  }

  // El pedido confirmado manda sobre cualquier otra regla.
  if (path.startsWith("/checkout/success") || path.startsWith("/checkout/exito")) {
    return { ...base, type: "PURCHASE" }
  }
  if (path === "/checkout") {
    return { ...base, type: "CHECKOUT_START" }
  }

  if (parts[0] === "productos" && parts[1]) {
    return { ...base, type: "PRODUCT_VIEW", productSlug: clean(parts[1], MAX_TERM_LENGTH) }
  }

  const brandSlug = parts[0] === "marcas" && parts[1] ? clean(parts[1], MAX_TERM_LENGTH) : null
  const filters = extractFilters(params)
  const searchTerm = clean(params.get("q"), MAX_TERM_LENGTH)

  if (!isCatalogPath(path)) {
    return { ...base, filters }
  }

  // Dentro del catálogo: la categoría es el primer segmento, salvo que el
  // filtro `categoria` diga otra cosa.
  const categorySlug =
    clean(params.get("categoria"), MAX_TERM_LENGTH) ??
    (parts[0] && parts[0] !== "marcas" && parts[0] !== "buscar" ? parts[0] : null)

  if (searchTerm) {
    return { ...base, type: "SEARCH", searchTerm, categorySlug, brandSlug, filters }
  }
  if (filters) {
    return { ...base, type: "FILTER_APPLY", categorySlug, brandSlug, filters }
  }
  return { ...base, type: "CATEGORY_VIEW", categorySlug, brandSlug }
}

/** Clasificación gruesa del dispositivo. No guardamos el user-agent completo. */
export function classifyDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet"
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return "mobile"
  if (/android/.test(ua)) return "tablet"
  return "desktop"
}
