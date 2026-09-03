import type { Metadata } from "next"
import ProductGrid from "@/components/shop/ProductGrid"
import FilterSidebar from "@/components/shop/FilterSidebar"
import SearchForm from "@/components/shop/SearchForm"
import ShopLayout from "@/components/shop/ShopLayout"
import { getUniqueBrands } from "@/server/services/product.service"
import { getUniqueSizes, getUniqueColors } from "@/server/services/variant.service"
import { getColorPalette } from "@/server/services/product-color.service"

interface BuscarPageProps {
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

export const metadata: Metadata = {
  title: "Buscar | One Star",
  description: "Busca en el catálogo de One Star por producto, marca o modelo.",
  robots: { index: false, follow: true },
}

/** Filtros que deben sobrevivir a una nueva búsqueda (todo menos q y page). */
const PRESERVED_FILTERS = [
  "marca",
  "talla",
  "color",
  "precio_min",
  "precio_max",
  "orden",
] as const

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const resolvedSearchParams = await searchParams
  const [brands, sizes, colors, colorPalette] = await Promise.all([
    getUniqueBrands(),
    getUniqueSizes(),
    getUniqueColors(),
    getColorPalette(),
  ])

  const query = resolvedSearchParams.q?.trim()

  const currentParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).filter(([, v]) => v !== undefined) as [string, string][]
  )

  const preservedParams = Object.fromEntries(
    PRESERVED_FILTERS.flatMap((key) => {
      const value = resolvedSearchParams[key]
      return value ? [[key, value] as [string, string]] : []
    })
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
      <SearchForm query={query} preservedParams={preservedParams} />
      <ProductGrid
        searchParams={resolvedSearchParams}
        title={query ? `Resultados para “${query}”` : "Buscar"}
        subtitle={
          query
            ? undefined
            : "Escribe qué estás buscando o navega el catálogo con los filtros."
        }
        colorPalette={colorPalette}
      />
    </ShopLayout>
  )
}
