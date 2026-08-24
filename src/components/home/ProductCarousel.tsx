import { getProductsBySlugsAction } from "@/server/actions/product.actions"
import ProductCarouselClient from "./ProductCarouselClient"
import ProductShowcaseClient from "./ProductShowcaseClient"

export default async function ProductCarousel({ config = {} }: { config?: Record<string, unknown> }) {
  const title = typeof config.title === "string" && config.title ? config.title : "Últimos Sneakers"
  const theme = config.theme === "dark" ? "dark" : "light"
  const layout = config.layout === "showcase" ? "showcase" : "carousel"
  const productSlugs = Array.isArray(config.productSlugs)
    ? config.productSlugs.filter((slug): slug is string => typeof slug === "string")
    : []

  if (productSlugs.length === 0) return null

  // Fetch the actual products based on the saved slugs
  const products = await getProductsBySlugsAction(productSlugs)

  if (products.length === 0) return null

  if (layout === "showcase") {
    return <ProductShowcaseClient title={title} products={products} theme={theme} />
  }

  return (
    <ProductCarouselClient
      title={title}
      products={products}
      theme={theme}
    />
  )
}
