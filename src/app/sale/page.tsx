import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"

interface SalePageProps {
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
  title: "SALE | One Star",
  description: "Ofertas y descuentos en calzado. Solo por tiempo limitado.",
}

export default async function SalePage({ searchParams }: SalePageProps) {
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
        isOnSaleOnly
        title="SALE"
        subtitle="Descuentos por tiempo limitado"
        headerClassName="bg-[#E31C23] text-white [&_h1]:text-white [&_p]:text-white/80"
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
