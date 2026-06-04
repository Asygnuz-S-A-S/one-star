import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands, getUniqueSizes, getUniqueColors } from "@/lib/shop-utils"

interface ProductosPageProps {
  searchParams: {
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
    page?: string
    genero?: string
  }
}

export const metadata = {
  title: "Productos | One Star",
  description: "Explora todo el catálogo de calzado One Star.",
}

export default async function ProductosPage({ searchParams }: ProductosPageProps) {
  const [brands, sizes, colors] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
  ])

  const currentParams = new URLSearchParams(
    Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
  )

  return (
    <ShopLayout
      sidebar={
        <FilterSidebar
          brands={brands}
          sizes={sizes}
          colors={colors}
          currentParams={currentParams}
        />
      }
    >
      <ProductGrid
        searchParams={searchParams}
        title="PRODUCTOS"
        subtitle="Todo el catálogo One Star"
      />
    </ShopLayout>
  )
}
