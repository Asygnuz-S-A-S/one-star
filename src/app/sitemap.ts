import type { MetadataRoute } from "next"
import { getCategories } from "@/server/services/category.service"
import { getProductSitemapEntries } from "@/server/services/product.service"
import { getSiteUrl } from "@/lib/site-url"

/** El sitemap se regenera cada hora; no necesita ser dinámico por petición. */
export const revalidate = 3600

interface StaticRoute {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}

const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/productos", changeFrequency: "daily", priority: 0.9 },
  { path: "/lanzamientos", changeFrequency: "weekly", priority: 0.8 },
  { path: "/sale", changeFrequency: "daily", priority: 0.8 },
  { path: "/tarjeta-regalo", changeFrequency: "monthly", priority: 0.5 },
  { path: "/tiendas", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terminos", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()

  // Si la base de datos falla, el sitemap sigue sirviendo las rutas estáticas
  // en lugar de tumbar el build o devolver un 500 (mismo criterio que el layout).
  const [categories, products] = await Promise.all([
    getCategories().catch((error: unknown) => {
      console.error("[sitemap] getCategories falló:", error)
      return []
    }),
    getProductSitemapEntries().catch((error: unknown) => {
      console.error("[sitemap] getProductSitemapEntries falló:", error)
      return []
    }),
  ])

  return [
    ...STATIC_ROUTES.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...categories.map((category) => ({
      url: `${siteUrl}/c/${category.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((product) => ({
      url: `${siteUrl}/productos/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ]
}
