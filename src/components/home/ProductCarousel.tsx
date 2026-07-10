import { getProductsBySlugsAction } from "@/server/actions/product.actions"
import ProductCarouselClient from "./ProductCarouselClient"

export default async function ProductCarousel({ config = {} }: { config?: Record<string, any> }) {
  const title = config.title || "Últimos Sneakers"
  const theme = config.theme as "light" | "dark" || "light"
  const productSlugs = config.productSlugs as string[] || []

  if (productSlugs.length === 0) return null

  // Fetch the actual products based on the saved slugs
  const products = await getProductsBySlugsAction(productSlugs)

  if (products.length === 0) return null

  return (
    <ProductCarouselClient 
      title={title}
      products={products}
      theme={theme}
    />
  )
}
