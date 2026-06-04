import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands, getUniqueSizes, getUniqueColors } from "@/lib/shop-utils"

interface MujerPageProps {
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
  title: "Mujer | One Star",
  description: "Calzado para mujer. Sneakers, sandalias y más.",
}

export default async function MujerPage({ searchParams }: MujerPageProps) {
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
        genderFilter="MUJER"
        title="MUJER"
        subtitle="Calzado para mujer"
      />
    </ShopLayout>
  )
}
