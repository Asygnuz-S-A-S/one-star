/**
 * Proveedor de tiles para los mapas Leaflet (admin y /tiendas).
 *
 * Se usa OpenStreetMap directo porque no requiere API key. CARTO, el proveedor
 * anterior, empezó a devolver tiles con la marca "API KEY REQUIRED" para uso
 * sin clave. Si algún día el tráfico crece, cambiar aquí a un proveedor con
 * clave (MapTiler, Stadia) y agregar su dominio al CSP; las dos vistas del
 * mapa leen esta única configuración.
 */
export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/** Los tiles estándar de OSM llegan hasta el zoom 19. */
export const MAP_TILE_MAX_ZOOM = 19
