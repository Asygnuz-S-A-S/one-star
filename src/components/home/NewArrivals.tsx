import { getProducts } from "@/server/services/product.service"
import NewArrivalsLayout from "./NewArrivalsLayout"
import { buildProductFamilyCardColorSummary } from "@/lib/product-card-colors"

export default async function NewArrivals({ config = {} }: { config?: Record<string, unknown> }) {
  const title = typeof config.title === "string" ? config.title : "Lanzamientos"
  const subtitle = typeof config.subtitle === "string" ? config.subtitle : "nuevos modelos"
  const limit = config.limit ? Number(config.limit) : 3
  const theme = config.theme === "dark" ? "dark" : "light"

  const { products, total } = await getProducts({ categorySlug: "lanzamientos", orden: "reciente" }, limit)

  if (products.length === 0) return null

  const [hero, ...rest] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand ?? "",
    price: p.basePrice,
    salePrice: p.isOnSale && p.salePrice ? p.salePrice : undefined,
    imageUrl: p.images[0]?.url,
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
