import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands, getUniqueSizes, getUniqueColors } from "@/lib/shop-utils"

interface NinosPageProps {
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
  title: "Niños | One Star",
  description: "Calzado para niños, niñas, infantil y bebé.",
}

// Incluye todas las categorías infantiles
const KIDS_GENDERS = ["NINO", "NINA", "INFANTIL", "BEBE"]

export default async function NinosPage({ searchParams }: NinosPageProps) {
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
        extraGenders={KIDS_GENDERS}
        title="NIÑOS"
        subtitle="Calzado para niños y niñas"
      />
    </ShopLayout>
  )
}
