import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"

interface LanzamientosPageProps {
  searchParams: Promise<{
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
    page?: string
  }>
}

export const metadata = {
  title: "Lanzamientos | One Star",
  description: "Los últimos lanzamientos y novedades en calzado.",
}

export default async function LanzamientosPage({ searchParams }: LanzamientosPageProps) {
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

  // Default order: reciente (newest first)
  const params = { ...resolvedSearchParams, orden: resolvedSearchParams.orden ?? ("reciente" as const) }

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
        searchParams={params}
        title="LANZAMIENTOS"
        subtitle="Lo último en calzado urbano y deportivo"
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
