/**
 * Mapeo y resolución de logos de marcas para storefront y carruseles.
 * Provee logotipos vectoriales oficiales (SVG) cuando la marca no tiene
 * un logoUrl explícito configurado en la base de datos.
 */

export const DEFAULT_BRAND_LOGOS: Record<string, string> = {
  converse: "/brands/converse.svg",
  vans: "/brands/vans.svg",
  hoka: "/brands/hoka.svg",
  columbia: "/brands/columbia.svg",
  skechers: "/brands/skechers.svg",
  discovery: "/brands/discovery.svg",
  reshoevn8r: "/brands/reshoevn8r.svg",
  "sin-marca": "/brands/sin-marca.svg",
  "one-star": "/brands/sin-marca.svg",
  nike: "/brands/nike.svg",
  adidas: "/brands/adidas.svg",
  puma: "/brands/puma.svg",
  "new-balance": "/brands/new-balance.svg",
  on: "/brands/on.svg",
  "on-running": "/brands/on.svg",
  asics: "/brands/asics.svg",
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export interface BrandLogoInput {
  name?: string | null
  slug?: string | null
  logoUrl?: string | null
}

/**
 * Resuelve la URL del logo de una marca.
 * Si ya cuenta con `logoUrl`, la conserva. De lo contrario, busca el SVG oficial por slug o nombre.
 */
export function resolveBrandLogoUrl(brand: BrandLogoInput | string | null | undefined): string | null {
  if (!brand) return null

  if (typeof brand === "string") {
    const key = normalizeKey(brand)
    return DEFAULT_BRAND_LOGOS[key] ?? null
  }

  if (brand.logoUrl && brand.logoUrl.trim().length > 0) {
    return brand.logoUrl
  }

  if (brand.slug) {
    const slugKey = normalizeKey(brand.slug)
    if (DEFAULT_BRAND_LOGOS[slugKey]) {
      return DEFAULT_BRAND_LOGOS[slugKey]
    }
  }

  if (brand.name) {
    const nameKey = normalizeKey(brand.name)
    if (DEFAULT_BRAND_LOGOS[nameKey]) {
      return DEFAULT_BRAND_LOGOS[nameKey]
    }
  }

  return null
}
