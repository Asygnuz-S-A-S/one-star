/**
 * Textos de la ficha de producto y reglas de la tienda que el admin puede cambiar
 * sin programar (Admin → Contenido). Se guardan como JSON en una fila propia de
 * SiteContent, igual que la configuración del catálogo.
 */
export interface StorefrontSettings {
  /** Botón principal de la ficha y de la barra fija en celular. */
  addToCartLabel: string
  /** Botón secundario que lleva directo al pago. */
  buyNowLabel: string
  /** Fila «Stock en tienda» de la ficha: se puede pedir traslado entre tiendas, así que no se nombra una sede. */
  storeStockText: string
  /** true = las reseñas de clientes se publican al enviarlas; false = esperan aprobación en Admin → Reseñas. */
  autoPublishReviews: boolean
}

export const DEFAULT_STOREFRONT_SETTINGS: StorefrontSettings = {
  addToCartLabel: "Agregar al carrito",
  buyNowLabel: "Comprar ahora",
  storeStockText: "Disponible en cualquiera de nuestras tiendas.",
  autoPublishReviews: false,
}

export const STOREFRONT_LABEL_MAX = 40
export const STOREFRONT_TEXT_MAX = 160

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : fallback
}

/** Lee el JSON guardado; cualquier campo faltante o vacío vuelve al valor por defecto. */
export function parseStorefrontSettings(raw: unknown): StorefrontSettings {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  return {
    addToCartLabel: text(source.addToCartLabel, DEFAULT_STOREFRONT_SETTINGS.addToCartLabel, STOREFRONT_LABEL_MAX),
    buyNowLabel: text(source.buyNowLabel, DEFAULT_STOREFRONT_SETTINGS.buyNowLabel, STOREFRONT_LABEL_MAX),
    storeStockText: text(source.storeStockText, DEFAULT_STOREFRONT_SETTINGS.storeStockText, STOREFRONT_TEXT_MAX),
    autoPublishReviews:
      typeof source.autoPublishReviews === "boolean" ? source.autoPublishReviews : DEFAULT_STOREFRONT_SETTINGS.autoPublishReviews,
  }
}
