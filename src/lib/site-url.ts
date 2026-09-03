const DEFAULT_SITE_URL = "http://localhost:3000"

/**
 * URL pública del sitio, sin barra final. La usan `robots.ts` y `sitemap.ts`
 * para emitir URLs absolutas.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!raw) return DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}
