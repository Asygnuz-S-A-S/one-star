import { getProducts } from "@/server/services/product.service"
import { getCatalogRules } from "@/server/services/store-settings.service"
import NewArrivalsLayout from "./NewArrivalsLayout"
import { buildProductFamilyCardColorSummary } from "@/lib/product-card-colors"

export default async function NewArrivals({ config = {} }: { config?: Record<string, unknown> }) {
  const title = typeof config.title === "string" ? config.title : "Lanzamientos"
  const subtitle = typeof config.subtitle === "string" ? config.subtitle : "nuevos modelos"
  const limit = config.limit ? Number(config.limit) : 5
  const theme = config.theme === "dark" ? "dark" : "light"

  const rules = await getCatalogRules().catch(() => ({ hideImagelessProducts: true, newArrivalDays: 30, groupColorsInCatalog: true }))
  const launches = await getProducts({ categorySlug: "lanzamientos", orden: "reciente", requireImage: rules.hideImagelessProducts, groupColors: rules.groupColorsInCatalog }, limit)
  // Si la categoría no llena la sección, se completa con los productos más recientes que tienen video.
  const videoFill = launches.products.length < limit
    ? (await getProducts({ withVideo: true, orden: "reciente", requireImage: rules.hideImagelessProducts, groupColors: rules.groupColorsInCatalog }, limit)).products
        .filter((product) => !launches.products.some((launch) => launch.id === product.id))
    : []
  // Los que tienen video van primero: el destacado grande luce mejor en movimiento.
  const products = [...launches.products, ...videoFill]
    .sort((a, b) => Number(Boolean(b.videoUrl)) - Number(Boolean(a.videoUrl)))
    .slice(0, limit)
  const total = launches.total + videoFill.length

  if (products.length === 0) return null

  const [hero, ...rest] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? "",
    price: p.basePrice,
    salePrice: p.isOnSale && p.salePrice ? p.salePrice : undefined,
    imageUrl: p.images[0]?.url,
    videoUrl: p.videoUrl ?? undefined,
    secondaryImageUrl: p.images[1]?.url,
    gallery: p.images.slice(2).map((img) => img.url),
    isOnSale: p.isOnSale,
    isNew: p.isNew,
    hasStock: p.hasStock,
    colorSummary: buildProductFamilyCardColorSummary([p, ...p.colorSiblings]),
  }))

  return (
    <NewArrivalsLayout 
      title={title} 
      subtitle={subtitle} 
      total={total} 
      products={[hero, ...rest]} 
      theme={theme}
    />
  )
}
