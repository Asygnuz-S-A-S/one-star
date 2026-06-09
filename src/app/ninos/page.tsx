import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"

interface NinosPageProps {
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
  title: "Niños | One Star",
  description: "Calzado para niños, niñas, infantil y bebé.",
}

// Incluye todas las categorías infantiles
const KIDS_GENDERS = ["NINO", "NINA", "INFANTIL", "BEBE"]

export default async function NinosPage({ searchParams }: NinosPageProps) {
  const resolvedSearchParams = await searchParams
  const [brands, sizes, colors] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
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
          currentParams={currentParams.toString()}
        />
      }
    >
      <ProductGrid
        searchParams={resolvedSearchParams}
        extraGenders={KIDS_GENDERS}
        title="NIÑOS"
        subtitle="Calzado para niños y niñas"
      />
    </ShopLayout>
  )
}
