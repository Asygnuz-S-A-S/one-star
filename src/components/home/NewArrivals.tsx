import { getProducts } from "@/server/services/product.service"
import NewArrivalsLayout from "./NewArrivalsLayout"

export default async function NewArrivals({ config = {} }: { config?: Record<string, any> }) {
  const title = config.title || "Lanzamientos"
  const subtitle = config.subtitle || "nuevos modelos"
  const limit = config.limit ? Number(config.limit) : 3
  const theme = config.theme as "light" | "dark" || "light"

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
