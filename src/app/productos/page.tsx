import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"

interface ProductosPageProps {
  searchParams: Promise<{
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
    page?: string
    genero?: string
    categoria?: string
  }>
}

export const metadata = {
  title: "Productos | One Star",
  description: "Explora todo el catálogo de calzado One Star.",
}

export default async function ProductosPage({ searchParams }: ProductosPageProps) {
  const resolvedSearchParams = await searchParams
  const [brands, sizes, colors, colorPalette] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
    getColorPalette(),
  ])

  const currentParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).filter(([, v]) => v !== undefined) as [string, string][]
  )

  return (
    <ShopLayout
      sidebar={
        <FilterSidebar
          brands={brands}
          sizes={sizes}
          colors={colors}
          colorPalette={colorPalette}
          currentParams={currentParams.toString()}
        />
      }
    >
      <ProductGrid
        searchParams={resolvedSearchParams}
        title="PRODUCTOS"
        subtitle="Todo el catálogo One Star"
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
