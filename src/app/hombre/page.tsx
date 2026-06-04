import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands, getUniqueSizes, getUniqueColors } from "@/lib/shop-utils"

interface HombrePageProps {
  searchParams: {
    q?: string
    marca?: string
    talla?: string
    color?: string
    precio_min?: string
    precio_max?: string
    orden?: "precio_asc" | "precio_desc" | "reciente" | "antiguo"
    page?: string
  }
}

export const metadata = {
  title: "Hombre | One Star",
  description: "Calzado para hombre. Sneakers, botas y más.",
}

export default async function HombrePage({ searchParams }: HombrePageProps) {
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
        genderFilter="HOMBRE"
        title="HOMBRE"
        subtitle="Calzado para hombre"
      />
    </ShopLayout>
  )
}
