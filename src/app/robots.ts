import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-url"

/**
 * Rutas excluidas del rastreo: panel, API, y todo lo que sea privado o
 * transaccional. /buscar queda fuera porque genera URLs infinitas por query.
 */
const DISALLOWED_PATHS = [
  "/admin",
  "/api",
  "/buscar",
  "/carrito",
  "/checkout",
  "/cuenta",
  "/login",
  "/registro",
]

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
